"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#3ED6D8", "#F2A08F", "#6366F1", "#10B981", "#F59E0B", "#EC4899"];

interface ExpenseData {
    name: string;
    value: number;
}

interface MonthlyData {
    month: string;
    income: number;
    expense: number;
}

export function ExpenseDonutChart({ data }: { data: ExpenseData[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (data.length === 0 || total === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-zinc-500 text-sm">
                Sin datos de gastos
            </div>
        );
    }

    return (
        <div className="h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0];
                                const percentage = ((item.value as number / total) * 100).toFixed(1);
                                return (
                                    <div className="bg-[#0B0E14] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                                        <p className="text-white font-semibold text-sm">{item.name}</p>
                                        <p className="text-[#3ED6D8] font-mono text-sm">
                                            ${(item.value as number).toLocaleString("es-CO")} ({percentage}%)
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-black text-white">${(total / 1000).toFixed(0)}K</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Total</span>
            </div>
        </div>
    );
}

export function MonthlyBarChart({ data }: { data: MonthlyData[] }) {
    if (data.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-zinc-500 text-sm">
                Sin datos mensuales
            </div>
        );
    }

    return (
        <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 10 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-[#0B0E14] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                                        <p className="text-zinc-400 text-xs mb-1">{label}</p>
                                        {payload.map((p, i) => (
                                            <p key={i} className="font-mono text-sm" style={{ color: p.color }}>
                                                {p.name}: ${(p.value as number).toLocaleString("es-CO")}
                                            </p>
                                        ))}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="income" name="Ingresos" fill="#3ED6D8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Egresos" fill="#F2A08F" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ExpenseLegend({ data }: { data: ExpenseData[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="space-y-2">
            {data.slice(0, 5).map((item, index) => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                return (
                    <div key={item.name} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="flex-1 text-sm text-zinc-300 truncate">{item.name}</span>
                        <span className="text-xs text-zinc-500 font-mono">{percentage}%</span>
                    </div>
                );
            })}
        </div>
    );
}
