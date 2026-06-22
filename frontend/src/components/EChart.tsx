import { useEffect, useRef } from "react";
import * as echarts from "echarts";

/** Thin ECharts wrapper: inits once, updates option, handles resize + dispose. */
export default function EChart({ option, height = 240 }: { option: echarts.EChartsOption; height?: number | string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
    const ro = new ResizeObserver((entries) => {
      const { width, height: h } = entries[0]?.contentRect ?? {};
      // Only resize when the container actually has dimensions (avoids 0×0 init
      // in hidden tabs / accordions — the resize fires again when revealed).
      if (width && h) chart.current?.resize();
    });
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    // notMerge:false preserves legend selection, dataZoom window, tooltip state
    chart.current?.setOption(option, false);
  }, [option]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
