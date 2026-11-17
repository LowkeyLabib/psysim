import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ session: vi.fn(), signout: vi.fn(), me: vi.fn(), observed: { data: { user: { id: "account-a" } } as { user: { id: string } } | null, isPending: false } }));
vi.mock("../lib/config", () => ({ demoMode: false, localDevelopment: false, setupMissing: false }));
vi.mock("../lib/neonAuth", () => ({ neonAuth: { getSession: mocks.session, signOut: mocks.signout, useSession: () => mocks.observed } }));
vi.mock("../lib/api", () => ({ api: { me: mocks.me }, ApiError: class extends Error {}, localSignIn: vi.fn(), localSignOut: vi.fn() }));
import { AuthProvider, useAuth } from "../lib/auth";
function Screen() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <span>Loading</span>;
  return user ? <div>{user.id}<button onClick={() => void signOut()}>Logout</button></div> : <span>Signed out</span>;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.observed = { data: { user: { id: "account-a" } }, isPending: false };
  mocks.session.mockResolvedValue({ data: { session: { id: "session-a" } } });
  mocks.me.mockResolvedValue({ id: "account-a", displayName: "Learner A", role: "student" });
  mocks.signout.mockResolvedValue({ error: null });
});
it("restores the verified profile after remount and clears it on logout", async () => {
  const first = render(<AuthProvider><Screen /></AuthProvider>);
  expect(await screen.findByText("account-a")).toBeVisible();
  first.unmount();
  render(<AuthProvider><Screen /></AuthProvider>);
  expect(await screen.findByText("account-a")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  expect(await screen.findByText("Signed out")).toBeVisible();
  expect(mocks.signout).toHaveBeenCalledOnce();
  expect(screen.queryByText("account-a")).toBeNull();
});
it("rejects an expired API session and discards the prior profile on account change", async () => {
  const view = render(<AuthProvider><Screen /></AuthProvider>);
  await screen.findByText("account-a");
  act(() => window.dispatchEvent(new Event("psysim:unauthenticated")));
  expect(screen.getByText("Signed out")).toBeVisible();
  mocks.observed = { data: { user: { id: "account-b" } }, isPending: false };
  mocks.me.mockResolvedValue({ id: "account-b", displayName: "Learner B", role: "student" });
  view.rerender(<AuthProvider><Screen /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("account-b")).toBeVisible());
  expect(screen.queryByText("account-a")).toBeNull();
});
