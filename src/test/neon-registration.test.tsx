import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ signup: vi.fn(), signin: vi.fn(), session: vi.fn(), refresh: vi.fn() }));
vi.mock("../lib/config", () => ({ demoMode: false, localDevelopment: false, setupMissing: false }));
vi.mock("../lib/neonAuth", () => ({ neonAuth: { signUp: { email: mocks.signup }, signIn: { email: mocks.signin }, getSession: mocks.session } }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: null, loading: false, error: "", refresh: mocks.refresh }) }));
vi.mock("../components/Layout", () => ({ Logo: () => <span>PsySim</span> }));
import Auth from "../pages/Auth";
beforeEach(() => { vi.clearAllMocks(); mocks.signup.mockResolvedValue({ data: {}, error: null }); mocks.session.mockResolvedValue({ data: null }); });
function form() {
  render(<MemoryRouter><Auth /></MemoryRouter>);
  fireEvent.click(screen.getByText("New to PsySim? Create an account"));
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Learner" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "learner@example.test" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "test-password-123" } });
}
it("rejects password mismatch before calling Neon", async () => {
  form(); fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Passwords do not match.")).toBeVisible();
  expect(mocks.signup).not.toHaveBeenCalled();
});
it("supports visibility and the email verification flow", async () => {
  form(); fireEvent.click(screen.getByRole("button", { name: "Show passwords" }));
  expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text");
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "test-password-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Check your email to confirm your account, then sign in.")).toBeVisible();
  expect(mocks.signup).toHaveBeenCalledWith(expect.objectContaining({ name: "Learner", email: "learner@example.test" }));
});
it("restores an immediately established account session", async () => {
  mocks.session.mockResolvedValue({ data: { session: { id: "session" } } });
  form(); fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "test-password-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
});
it("does not expose duplicate-account provider details", async () => {
  mocks.signup.mockResolvedValue({ error: { message: "User already exists" } });
  form(); fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "test-password-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText(/Unable to create the account/)).toBeVisible();
  expect(screen.queryByText("User already exists")).toBeNull();
});
