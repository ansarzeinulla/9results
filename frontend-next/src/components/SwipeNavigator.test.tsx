import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import SwipeNavigator from "./SwipeNavigator";

const push = vi.fn();
let pathname = "/tournaments/t1/pairings";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

function swipe(el: HTMLElement, from: [number, number], to: [number, number]) {
  fireEvent.touchStart(el, {
    touches: [{ clientX: from[0], clientY: from[1] }],
  });
  fireEvent.touchEnd(el, {
    changedTouches: [{ clientX: to[0], clientY: to[1] }],
  });
}

describe("SwipeNavigator", () => {
  beforeEach(() => {
    push.mockClear();
    pathname = "/tournaments/t1/pairings";
  });

  it("navigates to the next tab on a left swipe", () => {
    const { container } = render(
      <SwipeNavigator slug="t1">
        <p>content</p>
      </SwipeNavigator>,
    );
    swipe(container.firstChild as HTMLElement, [300, 100], [100, 110]);
    expect(push).toHaveBeenCalledWith("/tournaments/t1/standings");
  });

  it("navigates to the previous tab on a right swipe", () => {
    const { container } = render(
      <SwipeNavigator slug="t1">
        <p>content</p>
      </SwipeNavigator>,
    );
    swipe(container.firstChild as HTMLElement, [100, 100], [300, 110]);
    expect(push).toHaveBeenCalledWith("/tournaments/t1/starting-rank");
  });

  it("ignores short swipes", () => {
    const { container } = render(
      <SwipeNavigator slug="t1">
        <p>content</p>
      </SwipeNavigator>,
    );
    swipe(container.firstChild as HTMLElement, [200, 100], [160, 100]);
    expect(push).not.toHaveBeenCalled();
  });

  it("ignores diagonal / vertical gestures", () => {
    const { container } = render(
      <SwipeNavigator slug="t1">
        <p>content</p>
      </SwipeNavigator>,
    );
    swipe(container.firstChild as HTMLElement, [300, 100], [100, 300]);
    expect(push).not.toHaveBeenCalled();
  });

  it("does not navigate past the last tab", () => {
    pathname = "/tournaments/t1/alphabetical";
    const { container } = render(
      <SwipeNavigator slug="t1">
        <p>content</p>
      </SwipeNavigator>,
    );
    swipe(container.firstChild as HTMLElement, [300, 100], [100, 100]);
    expect(push).not.toHaveBeenCalled();
  });

  it("treats a pairings round page as the pairings tab", () => {
    pathname = "/tournaments/t1/pairings/round/3";
    const { container } = render(
      <SwipeNavigator slug="t1">
        <p>content</p>
      </SwipeNavigator>,
    );
    swipe(container.firstChild as HTMLElement, [300, 100], [100, 100]);
    expect(push).toHaveBeenCalledWith("/tournaments/t1/standings");
  });
});
