"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface TrustLineChartProps {
  data: { month: string; score: number }[];
}

export default function TrustLineChart({ data }: TrustLineChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <Tooltip cursor={{ stroke: "#EAECF0", strokeWidth: 1 }} contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
          <Line type="monotone" dataKey="score" stroke="#137B3E" strokeWidth={3} dot={{ fill: "#137B3E", r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
