import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultChip from "./ResultChip";

describe("ResultChip", () => {
  it("renders dash placeholder for missing result", () => {
    render(<ResultChip result={null} />);
    expect(screen.getByText("− : −")).toBeDefined();
  });

  it("renders half-point draw label", () => {
    render(<ResultChip result="0.5-0.5" />);
    expect(screen.getByText("½ : ½")).toBeDefined();
  });

  it("renders bye label", () => {
    render(<ResultChip result="1BYE" />);
    expect(screen.getByText("BYE")).toBeDefined();
  });

  it("falls back to the raw code for unknown results", () => {
    render(<ResultChip result="9-9" />);
    expect(screen.getByText("9-9")).toBeDefined();
  });
});
