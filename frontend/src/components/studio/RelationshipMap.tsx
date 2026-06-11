import EChart from "../EChart";
import type { EChartsOption } from "echarts";

interface GraphNode { id: string; type: string }
interface GraphEdge { source: string; target: string; weight: number; sign: string; kind: string; label: string }

const TYPE_COLOR: Record<string, string> = { measure: "#12b5a3", dimension: "#4d7cff", temporal: "#a855f7" };

/**
 * Relationship Map — force-directed graph of how columns relate.
 * Numeric↔numeric edges are Pearson r; category→measure edges are eta² (variance explained).
 */
export default function RelationshipMap({ nodes, edges, muted }: { nodes: GraphNode[]; edges: GraphEdge[]; muted: string }) {
  if (!nodes.length) {
    return (
      <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        No statistically meaningful relationships found in this dataset (|r| ≥ 0.25 or η² ≥ 0.05).
        <div style={{ fontSize: "0.78rem", marginTop: 8 }}>That's an honest answer — Verita never invents structure that isn't there.</div>
      </div>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      backgroundColor: "rgba(11,14,26,0.92)", borderWidth: 0, textStyle: { color: "#f2f5ff", fontSize: 12 },
      formatter: (p: any) =>
        p.dataType === "edge"
          ? `${p.data.source} ↔ ${p.data.target}<br/>${p.data.label} (${p.data.kind === "pearson" ? "Pearson correlation" : "variance explained"})`
          : `<b>${p.data.name}</b> · ${p.data.category}`,
    },
    legend: {
      bottom: 0, textStyle: { color: muted, fontSize: 10 }, icon: "circle",
      data: ["measure", "dimension", "temporal"],
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        draggable: true,
        force: { repulsion: 320, edgeLength: [110, 200], gravity: 0.12 },
        categories: [
          { name: "measure", itemStyle: { color: TYPE_COLOR.measure } },
          { name: "dimension", itemStyle: { color: TYPE_COLOR.dimension } },
          { name: "temporal", itemStyle: { color: TYPE_COLOR.temporal } },
        ],
        label: { show: true, color: "#f2f5ff", fontFamily: "JetBrains Mono", fontSize: 11, position: "bottom" },
        data: nodes.map((n) => ({
          name: n.id,
          category: n.type === "geo" ? "dimension" : n.type,
          symbolSize: 16 + 10 * Math.min(3, edges.filter((e) => e.source === n.id || e.target === n.id).length),
          itemStyle: {
            shadowBlur: 18,
            shadowColor: TYPE_COLOR[n.type === "geo" ? "dimension" : n.type] || "#4d7cff",
          },
        })),
        links: edges.map((e) => ({
          ...e, // keep weight/sign/kind/label string available to the tooltip via p.data
          source: e.source,
          target: e.target,
          label: { show: true, formatter: e.label, color: muted, fontSize: 9, fontFamily: "JetBrains Mono" },
          lineStyle: {
            width: 1 + e.weight * 5,
            color: e.sign === "negative" ? "#ff4d5e" : e.kind === "eta_squared" ? "#4d7cff" : "#12b5a3",
            opacity: 0.55,
            curveness: 0.12,
          },
        })) as any,
      },
    ],
  };

  return (
    <div className="glass" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Relationship map</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          teal edge = correlation (r) · blue edge = category influence (η²) · drag nodes, scroll to zoom
        </span>
      </div>
      <EChart option={option} height={420} />
    </div>
  );
}
