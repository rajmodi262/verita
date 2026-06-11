import { useEffect, useState } from "react";
import * as echarts from "echarts";
import EChart from "../EChart";
import type { EChartsOption } from "echarts";

/** ISO-2 → ECharts world-map country names (common financial corridors). */
const ISO2: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France", IT: "Italy",
  ES: "Spain", NL: "Netherlands", CH: "Switzerland", SG: "Singapore", HK: "Hong Kong",
  CN: "China", JP: "Japan", IN: "India", AE: "United Arab Emirates", SA: "Saudi Arabia",
  RU: "Russia", KY: "Cayman Is.", PA: "Panama", SC: "Seychelles", BR: "Brazil",
  MX: "Mexico", CA: "Canada", AU: "Australia", ZA: "South Africa", NG: "Nigeria",
  TR: "Turkey", IR: "Iran", KP: "Korea", CU: "Cuba", VE: "Venezuela", MM: "Myanmar",
  AF: "Afghanistan", PK: "Pakistan", BD: "Bangladesh", PH: "Philippines", TH: "Thailand",
};

const WORLD_GEOJSON_URL = "https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json";
let _worldLoaded = false;

/**
 * Auto geo-map — a world choropleth that appears because Verita detected a geo column.
 * GeoJSON loads from CDN once; if offline, we fall back to a clean bar list (honest fallback).
 */
export default function GeoMap({ data, title }: { data: { label: string; value: number }[]; title: string }) {
  const [state, setState] = useState<"loading" | "ready" | "fallback">(_worldLoaded ? "ready" : "loading");

  useEffect(() => {
    if (_worldLoaded) return;
    fetch(WORLD_GEOJSON_URL)
      .then((r) => r.json())
      .then((geo) => {
        echarts.registerMap("world", geo);
        _worldLoaded = true;
        setState("ready");
      })
      .catch(() => setState("fallback"));
  }, []);

  if (state === "loading") {
    return <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading world map…</div>;
  }

  if (state === "fallback") {
    return (
      <div className="glass" style={{ padding: 18 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, marginBottom: 10 }}>{title} (map unavailable offline)</div>
        {data.map((d) => (
          <div key={d.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
            <span>{d.label}</span><span style={{ fontFamily: "var(--font-mono)" }}>{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }

  const mapped = data
    .map((d) => ({ name: ISO2[d.label.toUpperCase()] || d.label, value: d.value }))
    .filter((d) => d.name);
  const max = Math.max(...mapped.map((d) => d.value), 1);

  const option: EChartsOption = {
    tooltip: {
      backgroundColor: "rgba(11,14,26,0.92)", borderWidth: 0, textStyle: { color: "#f2f5ff" },
      formatter: (p: any) => (p.value ? `<b>${p.name}</b><br/>${Number(p.value).toLocaleString()}` : `${p.name}: no activity`),
    },
    visualMap: {
      min: 0, max, calculable: true, left: 10, bottom: 10,
      inRange: { color: ["#1b2440", "#4d7cff", "#22d3ee"] },
      textStyle: { color: "#8c97b5", fontSize: 10 },
    },
    series: [
      {
        type: "map", map: "world", roam: true,
        itemStyle: { areaColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)" },
        emphasis: { label: { show: false }, itemStyle: { areaColor: "#a855f7" } },
        select: { disabled: true },
        data: mapped,
      },
    ],
  };

  return (
    <div className="glass" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>auto-generated — geo column detected · drag to pan, scroll to zoom</span>
      </div>
      <EChart option={option} height={440} />
    </div>
  );
}
