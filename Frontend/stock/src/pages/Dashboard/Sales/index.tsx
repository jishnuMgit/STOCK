import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS, Card, DonutChart, KpiCard, axisProps, fmt } from "../../../components/dashboard/shared";


const invoices = [
    { no: "JD-2600001", customer: "ALRAJHI TRAVELS", item: "DFS-PSS-GDI", qty: 2, net: 40, vat: 6 },
    { no: "JD-2600002", customer: "ALRAJHI TRAVELS", item: "ACCSS-AC-FOAM", qty: 5, net: 100, vat: 15 },
    { no: "JD-2600003", customer: "ALRAJHI TRAVELS", item: "ACCSS-AC-FOAM", qty: 2, net: 40, vat: 6 },
    { no: "JD-2600004", customer: "ALRAJHI TRAVELS", item: "ACCSS-AC-FOAM", qty: 5, net: 110, vat: 16.5 },
    { no: "JD-2600005", customer: "ALRAJHI TRAVELS", item: "ACCSS-AC-FOAM", qty: 2, net: 20, vat: 3 },
    { no: "JD-2600006", customer: "SIEMENS CORP", item: "ACCSS-AC-FOAM", qty: 10, net: 200, vat: 30 },
    { no: "JD-2600007", customer: "SIEMENS CORP", item: "ACCSS-AC-FOAM", qty: 5, net: 110, vat: 16.5 },
    { no: "JD-2600008", customer: "ALRAJHI TRAVELS", item: "ACCSS-1.5MM-CABLE", qty: 2, net: 20, vat: 3 },
];

const salesByCustomer = [
    { name: "ALRAJHI TRAVELS", value: 330 },
    { name: "SIEMENS CORP", value: 310 },
];

const salesByItem = [
    { name: "DFS-PSS-GDI", value: 40, color: COLORS.teal },
    { name: "ACCSS-AC-FOAM", value: 580, color: COLORS.amber },
    { name: "ACCSS-1.5MM-CABLE", value: 20, color: COLORS.rose },
];

const revenueVsCost = [
    { name: "GDI", cost: 40, net: 40 },
    { name: "AC-FOAM", cost: 580, net: 580 },
    { name: "1.5MM-CABLE", cost: 0, net: 20 },
];

const netVatByInvoice = invoices.map((i) => ({
    name: i.no.slice(-3),
    net: i.net,
    vat: i.vat,
}));

const SalesDashboardContent = () => {
    const totals = invoices.reduce(
        (a, i) => ({ qty: a.qty + i.qty, net: a.net + i.net, vat: a.vat + i.vat }),
        { qty: 0, net: 0, vat: 0 }
    );

    const kpis = [
        { label: "Net Sales (excl. VAT)", value: `SAR ${totals.net}`, color: COLORS.blue },
        { label: "VAT Collected", value: `SAR ${totals.vat}`, color: COLORS.violet },
        { label: "Total Invoiced", value: `SAR ${totals.net + totals.vat}`, color: COLORS.teal },
        { label: "Units Sold", value: String(totals.qty), color: COLORS.amber },
        { label: "Gross Margin", value: "0.0%", color: COLORS.rose },
    ];

    return (
        <div className="space-y-4">
            <p className="text-xs text-gray-500">
                Source: stock_db (Sales Invoices) &nbsp;|&nbsp; Branch: Jeddah &nbsp;|&nbsp; Currency: SAR
                &nbsp;|&nbsp; {invoices.length} invoices &nbsp;|&nbsp; 12 Nov 2026
            </p>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {kpis.map((k) => (
                    <KpiCard key={k.label} {...k} />
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Net Sales by Customer (SAR)">
                    <div className="h-60">
                        <ResponsiveContainer>
                            <BarChart data={salesByCustomer} layout="vertical" margin={{ right: 36 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={110} {...axisProps} />
                                <Tooltip />
                                <Bar dataKey="value" fill={COLORS.green} radius={[0, 3, 3, 0]} label={{ position: "right", fontSize: 11 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Net Sales by Item">
                    <DonutChart data={salesByItem} centerLabel="SAR" centerValue="640" />
                </Card>

                <Card title="Revenue vs Cost by Item (SAR)">
                    <div className="h-60">
                        <ResponsiveContainer>
                            <BarChart data={revenueVsCost} barGap={2}>
                                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" {...axisProps} />
                                <YAxis {...axisProps} />
                                <Tooltip />
                                <Legend iconType="square" />
                                <Bar dataKey="cost" name="Cost" fill={COLORS.soft} radius={[3, 3, 0, 0]} />
                                <Bar dataKey="net" name="Net sales" fill={COLORS.green} radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
                <Card title="Invoice Register" className="lg:col-span-3">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500">
                                    <th className="pb-2 font-medium">Invoice</th>
                                    <th className="pb-2 font-medium">Customer</th>
                                    <th className="pb-2 font-medium">Item</th>
                                    <th className="pb-2 text-right font-medium">Qty</th>
                                    <th className="pb-2 text-right font-medium">Net</th>
                                    <th className="pb-2 text-right font-medium">VAT</th>
                                    <th className="pb-2 text-right font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((i) => (
                                    <tr key={i.no} className="border-t border-gray-100">
                                        <td className="py-1.5">{i.no}</td>
                                        <td className="py-1.5">{i.customer}</td>
                                        <td className="py-1.5">{i.item}</td>
                                        <td className="py-1.5 text-right">{i.qty}</td>
                                        <td className="py-1.5 text-right">{fmt(i.net)}</td>
                                        <td className="py-1.5 text-right">{fmt(i.vat)}</td>
                                        <td className="py-1.5 text-right font-semibold">{fmt(i.net + i.vat)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 font-bold">
                                    <td className="py-2" colSpan={3}>Total</td>
                                    <td className="py-2 text-right">{totals.qty}</td>
                                    <td className="py-2 text-right">{fmt(totals.net)}</td>
                                    <td className="py-2 text-right">{fmt(totals.vat)}</td>
                                    <td className="py-2 text-right">{fmt(totals.net + totals.vat)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                <Card title="Net Sales + VAT by Invoice (SAR)" className="lg:col-span-2">
                    <div className="h-64">
                        <ResponsiveContainer>
                            <BarChart data={netVatByInvoice}>
                                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" {...axisProps} />
                                <YAxis {...axisProps} />
                                <Tooltip />
                                <Legend iconType="square" />
                                <Bar dataKey="net" name="Net" stackId="a" fill={COLORS.green} />
                                <Bar dataKey="vat" name="VAT" stackId="a" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-1 text-center text-xs text-gray-400">Invoice no. (JD-2600xxx)</p>
                </Card>
            </div>

            <p className="text-xs text-gray-400">
                Margin = net sales minus cost, using invoice unit cost or the stock-control cost (SAR 20)
                where missing; items with no cost on record (cable) are excluded.
            </p>
        </div>
    );
};

export default function SalesDashboardPage() {
    return (
        <div className="min-h-full bg-slate-50 p-4 md:p-6">
            <h1 className="mb-4 text-2xl font-bold text-slate-800">Sales Dashboard</h1>
            <SalesDashboardContent />
        </div>
    );
}