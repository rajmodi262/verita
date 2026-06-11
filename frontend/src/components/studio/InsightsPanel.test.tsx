import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InsightsPanel, { type Insight } from "./InsightsPanel";

const insights: Insight[] = [
  { kind: "comparison", icon: "🧪", severity: "info", text: "HNW is significantly higher (p<0.01)", evidence: "scipy.stats.ttest_ind(...) p=0.003" },
  { kind: "quality", icon: "⚠", severity: "warning", text: "country is 30% empty", evidence: "120 nulls" },
];

describe("InsightsPanel", () => {
  it("renders the executive summary and all findings", () => {
    render(<InsightsPanel insights={insights} summary="A summary sentence." />);
    expect(screen.getByText("A summary sentence.")).toBeInTheDocument();
    expect(screen.getByText(/HNW is significantly higher/)).toBeInTheDocument();
    expect(screen.getByText(/country is 30% empty/)).toBeInTheDocument();
  });

  it("reveals the evidence trail on demand (auditability)", () => {
    render(<InsightsPanel insights={insights} summary="x" />);
    expect(screen.queryByText(/ttest_ind/)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByText("how was this computed?")[0]);
    expect(screen.getByText(/ttest_ind/)).toBeInTheDocument();
  });
});
