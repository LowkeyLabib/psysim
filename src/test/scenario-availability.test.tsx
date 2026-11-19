import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NewSession from "../pages/NewSession";

const apiMocks = vi.hoisted(() => ({
  categories: vi.fn(),
  availableScenarios: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../lib/config", () => ({
  localDevelopment: false,
  demoMode: false,
  setupMissing: false,
  apiBase: "https://psysim.test/api",
  neonAuthUrl: "https://auth.psysim.test",
}));

vi.mock("../lib/api", () => ({
  api: apiMocks,
}));

const sampleCategories = [
  { id: "depressive", name: "Depressive disorders", description: "Mood" },
  { id: "ocd", name: "Obsessive-compulsive & related disorders", description: "OCD" },
];

function renderNewSession(initialPath = "/new") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/new" element={<NewSession />} />
        <Route path="/sessions/:id" element={<div>Consultation started</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewSession scenario availability UX", () => {
  beforeEach(() => {
    apiMocks.categories.mockResolvedValue(sampleCategories);
    apiMocks.availableScenarios.mockReset();
    apiMocks.create.mockReset();
  });

  it("shows a clear message and disables start when 0 approved cases are available", async () => {
    apiMocks.availableScenarios.mockResolvedValue([]);
    renderNewSession();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "No clinically reviewed cases are currently available",
    );
    expect(
      screen.getByRole("button", { name: "Begin consultation" }),
    ).toBeDisabled();
    expect(apiMocks.create).not.toHaveBeenCalled();
  });

  it("respects mode, category, and difficulty filters for approved cases and starts when available", async () => {
    apiMocks.availableScenarios.mockResolvedValue([
      { available: true, categoryId: "ocd", difficulty: "intermediate" },
    ]);
    apiMocks.create.mockResolvedValue({ id: "sess-1" });
    const user = userEvent.setup();
    renderNewSession();

    // Beginner has no approved case yet.
    expect(await screen.findByRole("status")).toHaveTextContent(
      "No clinically reviewed case is available for this difficulty yet",
    );
    expect(
      screen.getByRole("button", { name: "Begin consultation" }),
    ).toBeDisabled();

    // Switching to Intermediate enables Clinical Challenge start.
    await user.click(screen.getByRole("button", { name: /Intermediate/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Begin consultation" }),
      ).toBeEnabled(),
    );

    // Switching to Custom Case + Depressive (unapproved) disables and explains.
    await user.click(screen.getByRole("button", { name: /Custom Case/i }));
    await user.selectOptions(
      screen.getByLabelText("Diagnostic category"),
      "depressive",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "No clinically reviewed case is available for this category and difficulty yet",
    );
    expect(
      screen.getByRole("button", { name: "Begin consultation" }),
    ).toBeDisabled();

    // Switching category to OCD (approved at intermediate) starts the consultation cleanly.
    await user.selectOptions(
      screen.getByLabelText("Diagnostic category"),
      "ocd",
    );
    const startBtn = screen.getByRole("button", { name: "Begin consultation" });
    expect(startBtn).toBeEnabled();
    await user.click(startBtn);

    expect(await screen.findByText("Consultation started")).toBeInTheDocument();
    expect(apiMocks.create).toHaveBeenCalledWith(
      {
        mode: "custom",
        difficulty: "intermediate",
        language: "en",
        categoryId: "ocd",
      },
      expect.any(String),
    );
  });
});
