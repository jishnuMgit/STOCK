import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS, Card, DonutChart, KpiCard, axisProps, fmt } from "../../../components/dashboard/shared";

// ----- General (Stock) -----
const stockKpis = [
    { label: "Stock Items", value: "9", color: COLORS.blue },
    { label: "Item Groups", value: "6", color: COLORS.teal },
    { label: "Branches", value: "3", color: COLORS.violet },
    { label: "Stock on Hand (Qty)", value: "113", color: COLORS.amber },
    { label: "Stock Value", value: "SAR 2,260", color: COLORS.rose },
];

const stockMovement = [
    { name: "DFS-PSS-GDI\nRiyadh", opening: 0, current: 20 },
    { name: "DFS-PSS-GDI\nJeddah", opening: 10, current: 8 },
    { name: "ACCSS-AC-FOAM\nJeddah", opening: 90, current: 85 },
];

const stockByBranch = [
    { name: "Riyadh", value: 400, color: COLORS.blue },
    { name: "Jeddah", value: 1860, color: COLORS.teal },
];

const itemsByGroup = [
    { name: "Projects", value: 5 },
    { name: "Lights", value: 2 },
    { name: "Transport", value: 1 },
    { name: "Tiles", value: 1 },
];

const purchases = [
    { name: "ACCSS-AC-FOAM", value: 2000, qty: 100 },
    { name: "DFS-PSS-GDI", value: 600, qty: 30 },
];

const reorderAlerts = [
    { item: "LED Bulbs", reorder: 4, onHand: 0 },
    { item: "AC Compressor", reorder: 2, onHand: 0 },
    { item: "Refrigator- Samsung", reorder: 4, onHand: 0 },
];

const priceList = [
    { item: "2001", price: 10 },
    { item: "2002", price: 10 },
    { item: "ACCSS-1.5MM-CABLE", price: 20 },
    { item: "ACCSS-AC-FOAM", price: 20 },
    { item: "ACCSS-AC-FRAME", price: 20 },
    { item: "DFS-PSS-GDI", price: 20 },
];

const GeneralDashboardContent = () => (
    <div className="space-y-4">
        <p className="text-xs text-gray-500">
            Source: stock_db &nbsp;|&nbsp; Branches: Riyadh, Jeddah, Dammam &nbsp;|&nbsp; Currency: SAR
            &nbsp;|&nbsp; As of 12 Nov 2026
        </p>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {stockKpis.map((k) => (
                <KpiCard key={k.label} {...k} />
            ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Stock Movement by Item & Branch (Qty)">
                <div className="h-60">
                    <ResponsiveContainer>
                        <BarChart data={stockMovement} barGap={2}>
                            <CartesianGrid vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" {...axisProps} tickFormatter={(v: string) => v.split("\n")[0]} />
                            <YAxis {...axisProps} />
                            <Tooltip />
                            <Legend iconType="square" />
                            <Bar dataKey="opening" name="Opening stock" fill={COLORS.soft} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="current" name="Current stock" fill={COLORS.green} radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card title="Stock Value by Branch">
                <DonutChart data={stockByBranch} centerLabel="SAR" centerValue="2,260" />
            </Card>

            <Card title="Items by Item Group">
                <div className="h-60">
                    <ResponsiveContainer>
                        <BarChart data={itemsByGroup} layout="vertical" margin={{ right: 24 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={70} {...axisProps} />
                            <Tooltip />
                            <Bar dataKey="value" fill={COLORS.teal} radius={[0, 3, 3, 0]} label={{ position: "right", fontSize: 11 }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Stock Received - Purchase Invoices (SAR)">
                <div className="h-52">
                    <ResponsiveContainer>
                        <BarChart data={purchases} layout="vertical" margin={{ right: 70 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={100} {...axisProps} />
                            <Tooltip />
                            <Bar
                                dataKey="value"
                                fill={COLORS.amber}
                                radius={[0, 3, 3, 0]}
                                label={{
                                    position: "right",
                                    fontSize: 11,
                                    formatter: (v) => Number(v).toLocaleString(),
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="mt-1 text-right text-sm font-bold text-slate-800">Total: SAR 2,600</p>
            </Card>

            <Card title="Reorder Level Alerts">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-500">
                            <th className="pb-2 font-medium">Item</th>
                            <th className="pb-2 text-right font-medium">Reorder</th>
                            <th className="pb-2 text-right font-medium">On hand</th>
                            <th className="pb-2 text-right font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reorderAlerts.map((r) => (
                            <tr key={r.item} className="border-t border-gray-100">
                                <td className="py-2">{r.item}</td>
                                <td className="py-2 text-right">{r.reorder}</td>
                                <td className="py-2 text-right">{r.onHand}</td>
                                <td className="py-2 text-right font-semibold text-rose-500">Reorder</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Card title="Item Price List - Jeddah (SAR)">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-500">
                            <th className="pb-2 font-medium">Item</th>
                            <th className="pb-2 text-right font-medium">Unit price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {priceList.map((p) => (
                            <tr key={p.item} className="border-t border-gray-100">
                                <td className="py-1.5">{p.item}</td>
                                <td className="py-1.5 text-right font-semibold">{fmt(p.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    </div>
);

export default function GeneralDashboardPage() {
    return (
        <div className="min-h-full bg-slate-50 p-4 md:p-6">
            <h1 className="mb-4 text-2xl font-bold text-slate-800">Stock Dashboard</h1>
            <GeneralDashboardContent />
        </div>
    );
}