import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  let spy: any;
  beforeAll(() => { spy = vi.spyOn(console, "error").mockImplementation(() => {}); });
  afterAll(() => spy.mockRestore());

  it("renders children when there is no error", () => {
    render(<ErrorBoundary><div>safe content</div></ErrorBoundary>);
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  it("catches a render error and shows the fallback with the label", () => {
    render(<ErrorBoundary label="Studio"><Boom /></ErrorBoundary>);
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText(/Studio: kaboom/)).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });
});
