"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from "lightweight-charts";
import { PricePoint } from "@/lib/api";

interface LiveChartProps {
  data: PricePoint[];
  currentYesProb: number;
}

export function LiveChart({ data, currentYesProb }: LiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create TradingView Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717a",
        fontSize: 12,
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "#18181b" },
        horzLines: { color: "#18181b" },
      },
      crosshair: {
        vertLine: {
          color: "#3f3f46",
          width: 1,
          style: 1,
          labelBackgroundColor: "#27272a",
        },
        horzLine: {
          color: "#3f3f46",
          width: 1,
          style: 1,
          labelBackgroundColor: "#27272a",
        },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    // Add Area Series with Emerald theme for YES probability
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#10b981",
      topColor: "rgba(16, 185, 129, 0.35)",
      bottomColor: "rgba(16, 185, 129, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `%${price.toFixed(1)}`,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Format & sort data for chart
    let points = data.map((d) => ({
      time: Math.floor(new Date(d.recorded_at).getTime() / 1000) as unknown as string,
      value: d.yes_prob,
    }));

    // If only one data point or empty, create a baseline
    if (points.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      points = [
        { time: (now - 3600) as unknown as string, value: currentYesProb },
        { time: now as unknown as string, value: currentYesProb },
      ];
    } else if (points.length === 1) {
      const firstTime = Number(points[0].time);
      points = [
        { time: (firstTime - 3600) as unknown as string, value: points[0].value },
        points[0],
      ];
    }

    // Sort by time ascending & ensure unique timestamps
    points.sort((a, b) => Number(a.time) - Number(b.time));
    const uniquePoints = points.filter((p, i, arr) => i === 0 || p.time !== arr[i - 1].time);

    series.setData(uniquePoints);
    chart.timeScale().fitContent();

    // Auto-resize with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, currentYesProb]);

  return (
    <div className="relative w-full h-[280px] sm:h-[340px] bg-zinc-950/40 rounded-xl overflow-hidden">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
