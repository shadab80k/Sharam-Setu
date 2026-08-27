"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { formatINR } from "@/lib/utils";

interface ExpensesBarChartProps {
  data: { month: string; income: number; expense: number; savings: number }[];
}

export default function ExpensesBarChart({ data }: ExpensesBarChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }}
            formatter={(v: any) => formatINR(v as number)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" fill="#137B3E" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#D92D20" radius={[4, 4, 0, 0]} />
          <Bar dataKey="savings" fill="#2367C9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
