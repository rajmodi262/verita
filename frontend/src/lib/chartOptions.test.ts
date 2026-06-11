import { describe, it, expect } from "vitest";
import { specToOption, forecastOption, type ChartSpec, type ForecastData } from "./chartOptions";

const muted = "#888";
const grid = "#222";

describe("specToOption", () => {
  it("builds a line option from {x,y} data", () => {
    const spec: ChartSpec = { id: "l", chart_type: "line", title: "T", data: [{ x: "2024-01-01", y: 10 }, { x: "2024-01-02", y: 20 }] };
    const o: any = specToOption(spec, muted, grid);
    expect(o.series[0].type).toBe("line");
    expect(o.series[0].data).toEqual([10, 20]);
    expect(o.xAxis.data).toEqual(["2024-01-01", "2024-01-02"]);
  });

  it("builds a pie option from {label,value} data", () => {
    const spec: ChartSpec = { id: "p", chart_type: "pie", title: "T", data: [{ label: "Card", value: 5 }, { label: "Wire", value: 3 }] };
    const o: any = specToOption(spec, muted, grid);
    expect(o.series[0].type).toBe("pie");
    expect(o.series[0].data).toEqual([{ name: "Card", value: 5 }, { name: "Wire", value: 3 }]);
  });

  it("builds a heatmap with a visualMap", () => {
    const spec: ChartSpec = { id: "h", chart_type: "heatmap", title: "T", labels: ["a", "b"], data: [{ x: "a", y: "b", value: 0.5 }] as any };
    const o: any = specToOption(spec, muted, grid);
    expect(o.series[0].type).toBe("heatmap");
    expect(o.visualMap).toBeDefined();
  });

  it("falls back to base option for unknown chart types", () => {
    const o: any = specToOption({ id: "x", chart_type: "mystery", title: "T" }, muted, grid);
    expect(o.color).toBeDefined();
  });
});

describe("forecastOption", () => {
  const fc: ForecastData = {
    method: "holt",
    backtest_mape: 12.3,
    history: [{ x: "2024-01-01", y: 100 }, { x: "2024-01-02", y: 110 }],
    points: [{ x: "2024-01-03", y: 120, lo: 100, hi: 140 }],
  };

  it("renders actual + forecast + a CI band", () => {
    const o: any = forecastOption(fc, muted, grid);
    const names = o.series.map((s: any) => s.name);
    expect(names).toContain("actual");
    expect(names).toContain("forecast");
    expect(names).toContain("ci-band");
    // x axis spans history + forecast
    expect(o.xAxis.data).toEqual(["2024-01-01", "2024-01-02", "2024-01-03"]);
  });

  it("pads forecast series so it begins after history", () => {
    const o: any = forecastOption(fc, muted, grid);
    const forecast = o.series.find((s: any) => s.name === "forecast");
    expect(forecast.data.slice(0, fc.history.length).every((v: any) => v === null)).toBe(true);
  });
});
