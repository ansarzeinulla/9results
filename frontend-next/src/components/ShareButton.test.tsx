import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ShareButton from "./ShareButton";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("ShareButton", () => {
  it("uses navigator.share when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    render(<ShareButton title="Open Cup" />);
    fireEvent.click(screen.getByRole("button"));
    expect(share).toHaveBeenCalledWith({
      title: "Open Cup",
      url: window.location.href,
    });
  });

  it("falls back to clipboard and shows a copied hint", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<ShareButton title="Open Cup" />);
    fireEvent.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText("copied")).toBeDefined();
  });
});
