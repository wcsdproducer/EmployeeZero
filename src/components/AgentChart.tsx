"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  type: "line" | "bar" | "area";
  title?: string;
  data: any[];
}

export function AgentChart({ spec }: { spec: ChartData }) {
  const { type, title, data } = spec;

  // Dynamically find the Y-axis data key
  const yAxisKey = useMemo(() => {
    if (!data || data.length === 0) return "value";
    const keys = Object.keys(data[0]).filter((k) => k !== "name");
    return keys[0] || "value";
  }, [data]);

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 20, left: 0, bottom: 0 },
    };

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="name" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 12 }} tickFormatter={(val) => String(val)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#333", borderRadius: "8px" }}
              itemStyle={{ color: "#60a5fa" }}
            />
            <Bar dataKey={yAxisKey} fill="#60a5fa" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="name" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#333", borderRadius: "8px" }}
            />
            <Area type="monotone" dataKey={yAxisKey} stroke="#34d399" fill="#047857" fillOpacity={0.3} />
          </AreaChart>
        );
      case "line":
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="name" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#333", borderRadius: "8px" }}
            />
            <Line type="monotone" dataKey={yAxisKey} stroke="#a78bfa" strokeWidth={2} dot={{ fill: "#a78bfa" }} />
          </LineChart>
        );
    }
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="my-4 bg-[#111] border border-white/10 p-5 rounded-xl">
      {title && <h4 className="text-sm font-semibold mb-4 text-neutral-300">{title}</h4>}
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
