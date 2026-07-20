import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import PullToRefresh from "./PullToRefresh";

const refresh = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function pull(el: HTMLElement, distance: number) {
  fireEvent.touchStart(el, { touches: [{ clientX: 50, clientY: 100 }] });
  fireEvent.touchMove(el, {
    touches: [{ clientX: 50, clientY: 100 + distance }],
  });
  fireEvent.touchEnd(el);
}

describe("PullToRefresh", () => {
  beforeEach(() => refresh.mockClear());

  it("refreshes after a long enough pull from the top", () => {
    const { container } = render(
      <PullToRefresh>
        <p>content</p>
      </PullToRefresh>,
    );
    pull(container.firstChild as HTMLElement, 300);
    expect(refresh).toHaveBeenCalled();
  });

  it("does not refresh on a short pull", () => {
    const { container } = render(
      <PullToRefresh>
        <p>content</p>
      </PullToRefresh>,
    );
    pull(container.firstChild as HTMLElement, 40);
    expect(refresh).not.toHaveBeenCalled();
  });
});
