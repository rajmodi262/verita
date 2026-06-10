import type { EChartsOption } from "echarts";

/**
 * Map a backend chart spec (from the recommendation engine) into an ECharts option.
 * The backend pre-aggregates all data, so this is a pure shape transform.
 */

export interface ChartSpec {
  id: string;
  chart_type: string;
  title: string;
  // line
  data?: any[];
  // pie/bar use {label,value}; line uses {x,y}; histogram {bin,count}; heatmap {x,y,value}
  labels?: string[];
}

const PALETTE = ["#4d7cff", "#a855f7", "#22d3ee", "#16c784", "#f5a524", "#ff4d5e", "#6366f1"];

function axisStyle(muted: string, grid: string) {
  return {
    axisLine: { lineStyle: { color: grid } },
    axisLabel: { color: muted, fontFamily: "JetBrains Mono", fontSize: 10 },
    splitLine: { lineStyle: { color: grid, type: "dashed" as const } },
  };
}

export function specToOption(spec: ChartSpec, muted: string, grid: string): EChartsOption {
  const base = {
    grid: { left: 48, right: 18, top: 18, bottom: 32 },
    tooltip: { trigger: "item" as const, backgroundColor: "rgba(11,14,26,0.92)", borderWidth: 0, textStyle: { color: "#f2f5ff" } },
    color: PALETTE,
  };

  switch (spec.chart_type) {
    case "line": {
      const d = spec.data || [];
      return {
        ...base,
        tooltip: { ...base.tooltip, trigger: "axis" },
        xAxis: { type: "category", data: d.map((p) => p.x), ...axisStyle(muted, grid), boundaryGap: false },
        yAxis: { type: "value", ...axisStyle(muted, grid) },
        series: [
          {
            type: "line",
            smooth: true,
            symbol: "none",
            data: d.map((p) => p.y),
            lineStyle: { width: 2.5, color: "#4d7cff" },
            areaStyle: {
              color: {
                type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(77,124,255,0.35)" },
                  { offset: 1, color: "rgba(77,124,255,0.02)" },
                ],
              },
            },
          },
        ],
      };
    }
    case "bar": {
      const d = spec.data || [];
      return {
        ...base,
        tooltip: { ...base.tooltip, trigger: "axis" },
        xAxis: { type: "category", data: d.map((p) => p.label), ...axisStyle(muted, grid), axisLabel: { ...axisStyle(muted, grid).axisLabel, rotate: d.length > 6 ? 30 : 0 } },
        yAxis: { type: "value", ...axisStyle(muted, grid) },
        series: [{ type: "bar", data: d.map((p) => p.value), itemStyle: { borderRadius: [4, 4, 0, 0], color: "#4d7cff" }, barMaxWidth: 36 }],
      };
    }
    case "pie": {
      const d = spec.data || [];
      return {
        ...base,
        legend: { bottom: 0, textStyle: { color: muted, fontSize: 10 }, icon: "circle" },
        series: [
          {
            type: "pie",
            radius: ["48%", "72%"],
            center: ["50%", "44%"],
            avoidLabelOverlap: true,
            label: { show: false },
            data: d.map((p) => ({ name: p.label, value: p.value })),
          },
        ],
      };
    }
    case "histogram": {
      const d = spec.data || [];
      return {
        ...base,
        tooltip: { ...base.tooltip, trigger: "axis" },
        xAxis: { type: "category", data: d.map((p) => p.bin), ...axisStyle(muted, grid), axisLabel: { ...axisStyle(muted, grid).axisLabel, show: false } },
        yAxis: { type: "value", ...axisStyle(muted, grid) },
        series: [{ type: "bar", data: d.map((p) => p.count), itemStyle: { color: "#a855f7" }, barCategoryGap: "8%" }],
      };
    }
    case "heatmap": {
      const labels = spec.labels || [];
      const d = spec.data || [];
      return {
        tooltip: { position: "top", backgroundColor: "rgba(11,14,26,0.92)", borderWidth: 0, textStyle: { color: "#f2f5ff" } },
        grid: { left: 70, right: 18, top: 10, bottom: 60 },
        xAxis: { type: "category", data: labels, ...axisStyle(muted, grid), axisLabel: { ...axisStyle(muted, grid).axisLabel, rotate: 45 } },
        yAxis: { type: "category", data: labels, ...axisStyle(muted, grid) },
        visualMap: {
          min: -1, max: 1, calculable: true, orient: "horizontal", left: "center", bottom: 0,
          inRange: { color: ["#ff4d5e", "#0b0e1a", "#4d7cff"] },
          textStyle: { color: muted, fontSize: 9 },
        },
        series: [{ type: "heatmap", data: d.map((c) => [labels.indexOf(c.x), labels.indexOf(c.y), c.value]) }],
      };
    }
    default:
      return base;
  }
}
