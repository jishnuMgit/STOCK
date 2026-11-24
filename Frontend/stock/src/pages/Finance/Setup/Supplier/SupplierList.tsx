import React, { useEffect, useMemo, useState } from "react";
import { SquarePen, X } from "lucide-react";
import { useSupplier, type Supplier } from "../../../../hooks/useSupplier";
import SupplierPage from "./SupplierPage";
import Header from "../../../../components/common/Header";

// ============================================================
// STYLES & COLUMNS
// ============================================================

const TH =
    "border-b border-slate-400 bg-[#f4f8fb] px-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap";
const TD =
    "overflow-hidden whitespace-nowrap border-b border-slate-400 px-2 text-[11px] text-slate-700";

const COLUMNS = [
    { label: "Supplier ID", width: "w-[7%]", align: "text-left" },
    { label: "Supplier Name", width: "w-[40%]", align: "text-left" },
    { label: "Division", width: "w-[5%]", align: "text-center" },
    { label: "Branch", width: "w-[10%]", align: "text-left" },
    { label: "GL. Account ID", width: "w-[7%]", align: "text-left" },
    { label: "GL Account Name", width: "w-[15%]", align: "text-left" },
    { label: "Modify", width: "w-[5%]", align: "text-center" },
    { label: "Delete", width: "w-[5%]", align: "text-center" },
];

const MESSAGE_ROW = "h-17.5 text-center text-[12px]";

// null = closed, {} = Add, { supplierId, mode } = Modify / Delete form
type ModalState = { supplierId?: string; mode?: "modify" | "delete" } | null;

// ============================================================
// COMPONENT
// ============================================================

const SupplierList: React.FC = () => {
    const [search, setSearch] = useState("");
    const { suppliers, fetchSuppliers, loading, error } = useSupplier();
    const [modal, setModal] = useState<ModalState>(null);

    useEffect(() => {
        if (!modal) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setModal(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [modal]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    // ---------------- SEARCH ----------------

    const filteredSuppliers = useMemo(() => {
        const value = search.trim().toLowerCase();
        if (!value) return suppliers;

        return suppliers.filter((s) =>
            [
                s.lkpSupplierID,
                s.lkpSupplierName,
                s.lkpBranch,
                s.lkpGlAccountID,
                s.lkpGlAccountName,
            ].some((field) => field.toLowerCase().includes(value)),
        );
    }, [search, suppliers]);

    // ---------------- ACTIONS ----------------

    const handleModify = (supplier: Supplier) => {
        setModal({ supplierId: supplier.lkpSupplierID, mode: "modify" });
    };

    // Opens the supplier form (loaded, locked); the delete happens from there
    const handleDelete = (supplier: Supplier) => {
        setModal({ supplierId: supplier.lkpSupplierID, mode: "delete" });
    };

    // ---------------- RENDER ----------------

    return (
        <div className="mx-auto flex min-h-screen w-375 items-start justify-center bg-white px-4 pt-4">
            <div className="w-full border border-slate-300 bg-white shadow-sm">
                {/* TITLE */}
                <Header Name="Supplier List" />

                {/* SEARCH + ADD */}
                <div className="w-full px-2.5 py-3">
                    <div className="grid w-full grid-cols-[7%_50%_1fr] items-center">
                        <div className="col-span-2 w-[93%]">
                            <div className="relative w-full">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[21px] text-slate-600">
                                    ⌕
                                </span>
                                <input
                                    id="txtSearch"
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by Supplier ID, Supplier Name, GL Account ID, GL Account Name"
                                    className="h-8.5 w-[94.5%] rounded-[5px] border border-slate-400 bg-white pl-10 pr-4 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#8daac5] focus:ring-0"
                                />
                            </div>
                        </div>

                        <div className="flex items-center -ml-24 pl-2">
                            <button
                                id="btnAdd"
                                type="button"
                                onClick={() => setModal({})}
                                className="flex h-8.5 w-25 cursor-pointer shrink-0 items-center justify-center gap-1 rounded-sm border border-[#b7c8db] bg-[#e6f0fa] text-[12px] text-green-600 shadow-sm hover:bg-[#dceafa] focus:outline-none"
                            >
                                <span className="flex h-3.75 w-3.75 items-center justify-center rounded-full bg-green-600 text-[13px] font-bold leading-none text-white">
                                    +
                                </span>
                                <span>Add</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="mx-auto w-[98.5%] overflow-hidden border border-slate-400">
                    <div className="customer-table-scroll max-h-[calc(100vh-180px)] overflow-x-hidden overflow-y-auto">
                        <table className="mx-auto w-full table-fixed border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="h-8 bg-[#f4f8fb]">
                                    {COLUMNS.map((col, i) => (
                                        <th
                                            key={col.label}
                                            className={`${TH} ${col.width} ${col.align} ${i < COLUMNS.length - 1 ? "border-r" : ""
                                                }`}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {/* LOADING / ERROR / EMPTY */}
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={COLUMNS.length}
                                            className={`${MESSAGE_ROW} text-slate-500`}
                                        >
                                            Loading suppliers...
                                        </td>
                                    </tr>
                                )}

                                {!loading && error && (
                                    <tr>
                                        <td
                                            colSpan={COLUMNS.length}
                                            className={`${MESSAGE_ROW} text-red-600`}
                                        >
                                            {error}{" "}
                                            <button
                                                type="button"
                                                onClick={() => fetchSuppliers()}
                                                className="ml-2 text-blue-600 underline"
                                            >
                                                Retry
                                            </button>
                                        </td>
                                    </tr>
                                )}

                                {!loading && !error && filteredSuppliers.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={COLUMNS.length}
                                            className={`${MESSAGE_ROW} text-slate-500`}
                                        >
                                            No suppliers found
                                        </td>
                                    </tr>
                                )}

                                {/* ROWS */}
                                {!loading &&
                                    !error &&
                                    filteredSuppliers.map((s, i) => (
                                        <tr
                                            key={`${s.lkpSupplierID}-${i}`}
                                            className="h-8 hover:bg-[#f8fafc]"
                                        >
                                            <td className={`${TD} border-r`}>{s.lkpSupplierID}</td>

                                            <td
                                                title={s.lkpSupplierName}
                                                className={`${TD} border-r`}
                                            >
                                                {s.lkpSupplierName}
                                            </td>

                                            {/* DIVISION (read-only, from haveDivision) */}
                                            <td className={`${TD} border-r text-center`}>
                                                <input
                                                    id={`chkDivision-${i}`}
                                                    type="checkbox"
                                                    title="Division"
                                                    checked={s.lkpHaveDivision}
                                                    readOnly
                                                    className="h-3.5 w-3.5 accent-blue-600"
                                                />
                                            </td>

                                            <td className={`${TD} border-r`}>{s.lkpBranch}</td>
                                            <td className={`${TD} border-r`}>{s.lkpGlAccountID}</td>

                                            <td
                                                title={s.lkpGlAccountName}
                                                className={`${TD} border-r`}
                                            >
                                                {s.lkpGlAccountName}
                                            </td>

                                            {/* MODIFY */}
                                            <td className={`${TD} border-r p-0 text-center`}>
                                                <button
                                                    id={`btnModify-${i}`}
                                                    type="button"
                                                    title="Modify"
                                                    onClick={() => handleModify(s)}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
                                                >
                                                    <SquarePen width={15} height={15} />
                                                </button>
                                            </td>

                                            {/* DELETE */}
                                            <td className={`${TD} p-0 text-center`}>
                                                <button
                                                    id={`btnDelete-${i}`}
                                                    type="button"
                                                    title="Delete"
                                                    onClick={() => handleDelete(s)}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600"
                                                >
                                                    <X width={16} height={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="h-2.5" />
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-[95%] overflow-y-auto border border-slate-400 bg-white shadow-2xl lg:w-[65%]">
                        {/* key remounts the form when switching between Add / different suppliers */}
                        <SupplierPage
                            key={`${modal.mode ?? "add"}-${modal.supplierId ?? "new"}`}
                            supplierId={modal.supplierId}
                            mode={modal.mode}
                            onClose={() => setModal(null)}
                            onSaved={() => {
                                fetchSuppliers();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierList;