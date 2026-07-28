import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CreateTournament from "./CreateTournament";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
}));

const apiMock = vi.fn().mockResolvedValue({ id: 42 });
vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

afterEach(() => {
  cleanup();
  apiMock.mockClear();
  push.mockClear();
});

const lookups = {
  locations: [{ id: "Astana", name: "Astana" }],
  levels: [{ id: "National", name: "National" }],
  ratingTypes: [{ id: "Classic", name: "Classic" }],
  federations: [{ id: "KAZ", name: "KAZ" }],
  tournamentTypes: [{ id: "Swiss", name: "Swiss" }],
  tieBreaks: [
    { id: "WinCount", name: "Number of wins" },
    { id: "Buchholz", name: "Buchholz" },
    { id: "Berger", name: "Sonneborn-Berger" },
    { id: "CumulativeScore", name: "Cumulative score" },
  ],
  participantTypes: [{ id: "All", name: "All" }],
};

function fillRequiredBasics() {
  fireEvent.change(screen.getByPlaceholderText("fields.name"), {
    target: { value: "Test Cup" },
  });
}

describe("CreateTournament tie-break picker", () => {
  it("blocks submit when fewer than 4 tie-breaks are chosen", () => {
    render(<CreateTournament lookups={lookups} />);
    fillRequiredBasics();
    const tbSelects = screen.getAllByTitle(/^TB[1-4]$/);
    expect(tbSelects).toHaveLength(4);
    // Only fill TB1 and TB2, leave TB3/TB4 empty.
    fireEvent.change(tbSelects[0], { target: { value: "WinCount" } });
    fireEvent.change(tbSelects[1], { target: { value: "Buchholz" } });

    fireEvent.submit(screen.getByRole("button", { name: /createBtn/ }).closest("form")!);

    expect(apiMock).not.toHaveBeenCalled();
    expect(screen.getByText("fields.tieBreaksRequired")).toBeDefined();
  });

  it("submits all 4 chosen tie-breaks in order, repeats allowed", async () => {
    render(<CreateTournament lookups={lookups} />);
    fillRequiredBasics();
    const tbSelects = screen.getAllByTitle(/^TB[1-4]$/);
    fireEvent.change(tbSelects[0], { target: { value: "WinCount" } });
    fireEvent.change(tbSelects[1], { target: { value: "Buchholz" } });
    fireEvent.change(tbSelects[2], { target: { value: "Berger" } });
    // Repeat WinCount for TB4 — must be allowed.
    fireEvent.change(tbSelects[3], { target: { value: "WinCount" } });

    fireEvent.submit(screen.getByRole("button", { name: /createBtn/ }).closest("form")!);

    await screen.findByRole("button", { name: /createBtn/ });
    expect(apiMock).toHaveBeenCalledTimes(1);
    const [, options] = apiMock.mock.calls[0];
    const body = JSON.parse((options as { body: string }).body);
    expect(body.tie_breaks).toEqual(["WinCount", "Buchholz", "Berger", "WinCount"]);
  });
});
