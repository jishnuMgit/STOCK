import type { ReactNode } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export const COLORS = {
    green: "#16a34a",
    teal: "#14b8a6",
    blue: "#3b82f6",
    amber: "#f59e0b",
    rose: "#f43f5e",
    violet: "#8b5cf6",
    soft: "#bbf7d0",
};

export const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const KpiCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div
        className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
        style={{ borderLeft: `4px solid ${color}` }}
    >
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
);

export const Card = ({
    title,
    children,
    className = "",
}: {
    title: string;
    children: ReactNode;
    className?: string;
}) => (
    <section className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
        {children}
    </section>
);

export const DonutChart = ({
    data,
    centerLabel,
    centerValue,
}: {
    data: { name: string; value: number; color: string }[];
    centerLabel: string;
    centerValue: string;
}) => (
    <div className="relative h-56">
        <ResponsiveContainer>
            <PieChart>
                <Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={1}>
                    {data.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend
                    verticalAlign="bottom"
                    iconType="square"
                    formatter={(v, e) => `${v} (${(e.payload as { value: number }).value.toLocaleString()})`}
                />
            </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
            <p className="text-[10px] text-gray-500">{centerLabel}</p>
            <p className="text-base font-bold text-slate-800">{centerValue}</p>
        </div>
    </div>
);

export const axisProps = { tick: { fontSize: 11, fill: "#6b7280" }, axisLine: false, tickLine: false } as const;