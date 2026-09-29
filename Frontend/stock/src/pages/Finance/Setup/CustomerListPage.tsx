import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SquarePen, Trash } from "lucide-react";
import { useCustomer, type Customer } from "../../../hooks/useCustomer";

// ============================================================
// STYLES & COLUMNS
// ============================================================

const TH =
  "border-b border-slate-400 bg-[#f4f8fb] px-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap";
const TD =
  "overflow-hidden whitespace-nowrap border-b border-slate-400 px-2 text-[11px] text-slate-700";

const COLUMNS = [
  { label: "Customer ID", width: "w-[7%]", align: "text-left" },
  { label: "Customer Name", width: "w-auto", align: "text-left" },
  { label: "Division", width: "w-[5%]", align: "text-center" },
  { label: "Branch", width: "w-[10%]", align: "text-left" },
  { label: "GL. Account ID", width: "w-[7%]", align: "text-left" },
  { label: "GL Account Name", width: "w-[15%]", align: "text-left" },
  { label: "Modify", width: "w-[5%]", align: "text-center" },
  { label: "Delete", width: "w-[5%]", align: "text-center" },
];

const MESSAGE_ROW = "h-17.5 text-center text-[12px]";

// ============================================================
// COMPONENT
// ============================================================

const CustomerList: React.FC = () => {
  const [search, setSearch] = useState("");
  const { customers, fetchCustomers, loading, error } = useCustomer();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ---------------- SEARCH ----------------

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return customers;

    return customers.filter((c) =>
      [
        c.lkpCustomerID,
        c.lkpCustomerName,
        c.lkpBranch,
        c.lkpGlAccountID,
        c.lkpGlAccountName,
      ].some((field) => field.toLowerCase().includes(value)),
    );
  }, [search, customers]);

  // ---------------- ACTIONS ----------------

  const handleModify = (customer: Customer) => {
    console.log("Modify Customer:", customer);
  };

  const handleDelete = (customer: Customer) => {
    if (!window.confirm(`Delete customer "${customer.lkpCustomerName}"?`))
      return;
    console.log("Delete Customer:", customer);
  };

  // ---------------- RENDER ----------------

  return (
    <div className="mx-auto flex min-h-screen w-[1500px] items-start justify-center bg-white px-4 pt-4">
      <div className="w-full border border-slate-300 bg-white shadow-sm">
        {/* TITLE */}
        <div className="flex h-7.5 w-full items-center border-b border-slate-300 bg-[#a5e0c3]">
          <h1 className="ml-[10px] text-[17px] font-semibold text-slate-700">
            Customer List
          </h1>
        </div>

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
                  placeholder="Search by Customer ID, Customer Name, GL Account ID, GL Account Name"
                  className="h-8.5 w-full rounded-[5px] border border-slate-400 bg-white pl-10 pr-4 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#8daac5] focus:ring-0"
                />
              </div>
            </div>

            <div className="-ml-[55px] flex items-center pl-2">
              <Link to="/Finance/Setup/Add/Customer" className="shrink-0">
                <button
                  id="btnAdd"
                  type="button"
                  className="flex h-8.5 w-25 items-center justify-center gap-1 rounded-sm border border-[#b7c8db] bg-[#e6f0fa] text-[12px] text-green-600 shadow-sm hover:bg-[#dceafa] focus:outline-none"
                >
                  <span className="flex h-3.75 w-3.75 items-center justify-center rounded-full bg-green-600 text-[13px] font-bold leading-none text-white">
                    +
                  </span>
                  <span>Add</span>
                </button>
              </Link>
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
                      className={`${TH} ${col.width} ${col.align} ${
                        i < COLUMNS.length - 1 ? "border-r" : ""
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
                      Loading customers...
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
                        onClick={fetchCustomers}
                        className="ml-2 text-blue-600 underline"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                )}

                {!loading && !error && filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className={`${MESSAGE_ROW} text-slate-500`}
                    >
                      No customers found
                    </td>
                  </tr>
                )}

                {/* ROWS */}
                {!loading &&
                  !error &&
                  filteredCustomers.map((c, i) => (
                    <tr
                      key={`${c.lkpCustomerID}-${i}`}
                      className="h-8 hover:bg-[#f8fafc]"
                    >
                      <td className={`${TD} border-r`}>{c.lkpCustomerID}</td>

                      <td
                        title={c.lkpCustomerName}
                        className={`${TD} border-r`}
                      >
                        {c.lkpCustomerName}
                      </td>

                      {/* DIVISION (read-only, from haveDivision) */}
                      <td className={`${TD} border-r text-center`}>
                        <input
                          id={`chkDivision-${i}`}
                          type="checkbox"
                          title="Division"
                          checked={c.lkpHaveDivision}
                          readOnly
                          className="h-3.5 w-3.5 accent-blue-600"
                        />
                      </td>

                      <td className={`${TD} border-r`}>{c.lkpBranch}</td>
                      <td className={`${TD} border-r`}>{c.lkpGlAccountID}</td>

                      <td
                        title={c.lkpGlAccountName}
                        className={`${TD} border-r`}
                      >
                        {c.lkpGlAccountName}
                      </td>

                      {/* MODIFY */}
                      <td className={`${TD} border-r p-0 text-center`}>
                        <button
                          id={`btnModify-${i}`}
                          type="button"
                          title="Modify"
                          onClick={() => handleModify(c)}
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
                          onClick={() => handleDelete(c)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#FC0005] hover:bg-red-50 hover:text-red-600 focus:outline-none"
                        >
                          <Trash width={16} height={16} />
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
    </div>
  );
};

export default CustomerList;
