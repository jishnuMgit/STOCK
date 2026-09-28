import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SquarePen, Trash } from "lucide-react";

interface Customer {
  lkpCustomerID: string;
  lkpCustomerName: string;
  lkpDivID: string;
  lkpBranch: string;
  lkpGlAccountID: string;
  lkpGlAccountName: string;
}

// ============================================================
// DUMMY DATA
// ============================================================

const customers: Customer[] = [
  {
    lkpCustomerID: "1100",
    lkpCustomerName: "ARABIAN CHEMICAL CO. (PS) LTD",
    lkpDivID: "12",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410001",
    lkpGlAccountName: "ARABIAN CHEMICAL CO.",
  },
  {
    lkpCustomerID: "1004",
    lkpCustomerName: "E. A. JUFFALI & BROS H.O.",
    lkpDivID: "16",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410002",
    lkpGlAccountName: "E. A. JUFFALI & BROS",
  },
  {
    lkpCustomerID: "1007",
    lkpCustomerName: "E. A. JUFFALI & BROS-REAL ESTATE",
    lkpDivID: "10",
    lkpBranch: "RIYADH",
    lkpGlAccountID: "410003",
    lkpGlAccountName: "JUFFALI REAL ESTATE",
  },
  {
    lkpCustomerID: "1010",
    lkpCustomerName: "MAINTENANCE OF AIRCONDITIONING CO.LTD",
    lkpDivID: "14",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410004",
    lkpGlAccountName: "MAINTENANCE SERVICES",
  },
  {
    lkpCustomerID: "1020",
    lkpCustomerName: "JUFFALI CHEMICAL (PU)",
    lkpDivID: "19",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410005",
    lkpGlAccountName: "JUFFALI CHEMICAL",
  },
  {
    lkpCustomerID: "1025",
    lkpCustomerName: "SAUDI ERICSSON",
    lkpDivID: "22",
    lkpBranch: "DAMMAM",
    lkpGlAccountID: "410006",
    lkpGlAccountName: "SAUDI ERICSSON",
  },
  {
    lkpCustomerID: "1041",
    lkpCustomerName: "ARABIAN CHEMICAL CO. (LATEX)",
    lkpDivID: "17",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410007",
    lkpGlAccountName: "ARABIAN CHEMICAL LATEX",
  },
  {
    lkpCustomerID: "1048",
    lkpCustomerName: "JUFFALI AUTO CO. (JACO)",
    lkpDivID: "15",
    lkpBranch: "RIYADH",
    lkpGlAccountID: "410008",
    lkpGlAccountName: "JUFFALI AUTO",
  },
  {
    lkpCustomerID: "1052",
    lkpCustomerName: "SHEIKH ALI JUFFALI FAMILY",
    lkpDivID: "13",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410009",
    lkpGlAccountName: "SHEIKH ALI JUFFALI FAMILY",
  },
  {
    lkpCustomerID: "1052",
    lkpCustomerName: "SHAIKH ALI A.J. MAINT.",
    lkpDivID: "18",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410010",
    lkpGlAccountName: "SHAIKH ALI MAINTENANCE",
  },
  {
    lkpCustomerID: "1041",
    lkpCustomerName: "ARABIAN CHEMICAL CO. (LATEX)",
    lkpDivID: "17",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410007",
    lkpGlAccountName: "ARABIAN CHEMICAL LATEX",
  },
  {
    lkpCustomerID: "1048",
    lkpCustomerName: "JUFFALI AUTO CO. (JACO)",
    lkpDivID: "15",
    lkpBranch: "RIYADH",
    lkpGlAccountID: "410008",
    lkpGlAccountName: "JUFFALI AUTO",
  },
  {
    lkpCustomerID: "1052",
    lkpCustomerName: "SHEIKH ALI JUFFALI FAMILY",
    lkpDivID: "13",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410009",
    lkpGlAccountName: "SHEIKH ALI JUFFALI FAMILY",
  },
  {
    lkpCustomerID: "1052",
    lkpCustomerName: "SHAIKH ALI A.J. MAINT.",
    lkpDivID: "18",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410010",
    lkpGlAccountName: "SHAIKH ALI MAINTENANCE",
  },
  {
    lkpCustomerID: "1041",
    lkpCustomerName: "ARABIAN CHEMICAL CO. (LATEX)",
    lkpDivID: "17",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410007",
    lkpGlAccountName: "ARABIAN CHEMICAL LATEX",
  },
  {
    lkpCustomerID: "1048",
    lkpCustomerName: "JUFFALI AUTO CO. (JACO)",
    lkpDivID: "15",
    lkpBranch: "RIYADH",
    lkpGlAccountID: "410008",
    lkpGlAccountName: "JUFFALI AUTO",
  },
  {
    lkpCustomerID: "1052",
    lkpCustomerName: "SHEIKH ALI JUFFALI FAMILY",
    lkpDivID: "13",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410009",
    lkpGlAccountName: "SHEIKH ALI JUFFALI FAMILY",
  },
  {
    lkpCustomerID: "1052",
    lkpCustomerName: "SHAIKH ALI A.J. MAINT.",
    lkpDivID: "18",
    lkpBranch: "JEDDAH",
    lkpGlAccountID: "410010",
    lkpGlAccountName: "SHAIKH ALI MAINTENANCE",
  },
];

// ============================================================
// COMPONENT
// ============================================================

const CustomerList: React.FC = () => {
  const [search, setSearch] = useState("");

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.lkpCustomerID,
        customer.lkpCustomerName,
        customer.lkpDivID,
        customer.lkpBranch,
        customer.lkpGlAccountID,
        customer.lkpGlAccountName,
      ].some((field) => field.toLowerCase().includes(value))
    );
  }, [search]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleAddCustomer = () => {
    console.log("Add Customer");
  };

  const handleModify = (customer: Customer) => {
    console.log("Modify Customer:", customer);
  };

  const handleDelete = (customer: Customer) => {
    const confirmed = window.confirm(
      `Delete customer "${customer.lkpCustomerName}"?`
    );

    if (!confirmed) {
      return;
    }

    console.log("Delete Customer:", customer);
  };

  return (
    <div
      className="
        flex
        min-h-screen
        w-full
        items-start
        justify-center
        bg-white
        px-4
        pt-4
      "
    >
      {/* ============================================================
          MAIN PAGE
      ============================================================ */}

      <div className="w-screen border border-slate-300 bg-white shadow-sm">

        {/* ============================================================
            TITLE
        ============================================================ */}

        <div
          className="
            flex
            h-7.5
            w-full
            items-center
            border-b
            border-slate-300
            bg-[#a5e0c3]
          "
        >
          <h1
            className="
              ml-1.25
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
            Customer List
          </h1>
        </div>

        {/* ============================================================
            SEARCH AREA
            SAME WIDTH AS TABLE
        ============================================================ */}

       {/* ============================================================
    SEARCH AREA
    SEARCH ENDS EXACTLY AT CUSTOMER NAME COLUMN
============================================================ */}

<div className="mx-auto w-[95%] py-3">

  <div
    className="
      grid
      w-full
      grid-cols-[80px_minmax(0,1fr)_54px_80px_100px_180px_60px_60px]
      items-center
      gap-0
    "
  >

    {/* ========================================================
        SEARCH
        Spans Customer ID + Customer Name
    ======================================================== */}

    <div className="col-span-2 ">

      <div className="relative w-full">

        <span
          className="
            pointer-events-none
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            text-[21px]
            text-slate-600
          "
        >
          ⌕
        </span>

        <input
          id="txtSearch"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Customer ID, Customer Name, GL Account ID, GL Account Name"
          className="
            h-8.5
            w-full
            rounded-[5px]
            border
            border-slate-400
            bg-white
            pl-10
            pr-4
            text-[12px]
            text-slate-700
            outline-none
            placeholder:text-slate-400
            focus:border-[#8daac5]
            focus:ring-0
          "
        />

      </div>

    </div>

    {/* ========================================================
        ADD BUTTON
    ======================================================== */}

    <div className="col-span-2 flex left-0 ml-4">

      <Link
        to="/Finance/Setup/Add/Customer"
        className="shrink-0"
      >

        <button
          id="btnAdd"
          type="button"
          onClick={handleAddCustomer}
          className="
            flex
            h-8.5
            w-25
            items-center
            justify-center
            gap-1
            rounded-sm
            border
            border-[#b7c8db]
            bg-[#e6f0fa]
            text-[12px]
            text-green-600
            shadow-sm
            hover:bg-[#dceafa]
            focus:outline-none
          "
        >

          <span
            className="
              flex
              h-3.75
              w-3.75
              items-center
              justify-center
              rounded-full
              bg-green-600
              text-[13px]
              font-bold
              leading-none
              text-white
            "
          >
            +
          </span>

          <span>Add</span>

        </button>

      </Link>

    </div>

  </div>

</div>

        {/* ============================================================
            TABLE
        ============================================================ */}

        <div
          className="
            mx-auto
            w-[95%]
            overflow-hidden
            border
            border-slate-400
          "
        >
          <div
            className="
              customer-table-scroll
              max-h-[calc(100vh-180px)]
              overflow-y-auto
              overflow-x-hidden
            "
          >
            <table
              className="
                mx-auto
                w-full
                table-fixed
                border-collapse
              "
            >
              {/* ======================================================
                  HEADER
              ====================================================== */}

              <thead className="sticky top-0 z-10">

                <tr className="h-8 bg-[#f4f8fb]">

                  {/* Customer ID */}

                  <th
                    className="
                      w-20
                      border-b
                      border-r
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-left
                      text-[11px]
                      font-semibold
                      text-slate-800
                      whitespace-nowrap
                    "
                  >
                    Customer ID
                  </th>

                  {/* Customer Name */}

                  <th
                    className="
                      w-auto
                      border-b
                      border-r
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-left
                      text-[11px]
                      font-semibold
                      text-slate-800
                    "
                  >
                    Customer Name
                  </th>

                  {/* Div ID */}

                  <th
                    className="
                      w-13.5
                      border-b
                      border-r
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-left
                      text-[11px]
                      font-semibold
                      text-slate-800
                      whitespace-nowrap
                    "
                  >
                    Div. ID
                  </th>

                  {/* Branch */}

                  <th
                    className="
                      w-20
                      border-b
                      border-r
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-left
                      text-[11px]
                      font-semibold
                      text-slate-800
                    "
                  >
                    Branch
                  </th>

                  {/* GL Account ID */}

                  <th
                    className="
                      w-25
                      whitespace-nowrap
                      border-b
                      border-r
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-left
                      text-[11px]
                      font-semibold
                      text-slate-800
                    "
                  >
                    GL Account ID
                  </th>

                  {/* GL Account Name */}

                  <th
                    className="
                      w-45
                      whitespace-nowrap
                      border-b
                      border-r
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-left
                      text-[11px]
                      font-semibold
                      text-slate-800
                    "
                  >
                    GL Account Name
                  </th>

                  {/* Modify */}

                  <th
                    className="
                      w-15
                      whitespace-nowrap
                      border-b
                      border-r
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-center
                      text-[11px]
                      font-semibold
                      text-slate-800
                    "
                  >
                    Modify
                  </th>

                  {/* Delete */}

                  <th
                    className="
                      w-15
                      whitespace-nowrap
                      border-b
                      border-slate-400
                      bg-[#f4f8fb]
                      px-2
                      text-center
                      text-[11px]
                      font-semibold
                      text-slate-800
                    "
                  >
                    Delete
                  </th>

                </tr>
              </thead>

              {/* ======================================================
                  BODY
              ====================================================== */}

              <tbody>

                {filteredCustomers.map((customer, index) => (

                  <tr
                    key={`${customer.lkpCustomerID}-${customer.lkpCustomerName}-${index}`}
                    className="
                      h-8
                      hover:bg-[#f8fafc]
                    "
                  >

                    {/* Customer ID */}

                    <td
                      id="lkpCustomerID"
                      className="
                        overflow-hidden
                        whitespace-nowrap
                        border-b
                        border-r
                        border-slate-400
                        px-2
                        text-[11px]
                        text-slate-700
                      "
                    >
                      {customer.lkpCustomerID}
                    </td>

                    {/* Customer Name */}

                    <td
                      id="lkpCustomerName"
                      title={customer.lkpCustomerName}
                      className="
                        overflow-hidden
                        whitespace-nowrap
                        border-b
                        border-r
                        border-slate-400
                        px-2
                        text-[11px]
                        text-slate-700
                      "
                    >
                      {customer.lkpCustomerName}
                    </td>

                    {/* Div ID */}

                    <td
                      id="lkpDivID"
                      className="
                        overflow-hidden
                        whitespace-nowrap
                        border-b
                        border-r
                        border-slate-400
                        px-2
                        text-[11px]
                        text-slate-700
                      "
                    >
                      {customer.lkpDivID}
                    </td>

                    {/* Branch */}

                    <td
                      id="lkpBranch"
                      className="
                        overflow-hidden
                        whitespace-nowrap
                        border-b
                        border-r
                        border-slate-400
                        px-2
                        text-[11px]
                        text-slate-700
                      "
                    >
                      {customer.lkpBranch}
                    </td>

                    {/* GL Account ID */}

                    <td
                      id="lkpGlAccountID"
                      className="
                        overflow-hidden
                        whitespace-nowrap
                        border-b
                        border-r
                        border-slate-400
                        px-2
                        text-[11px]
                        text-slate-700
                      "
                    >
                      {customer.lkpGlAccountID}
                    </td>

                    {/* GL Account Name */}

                    <td
                      id="lkpGlAccountName"
                      title={customer.lkpGlAccountName}
                      className="
                        overflow-hidden
                        whitespace-nowrap
                        border-b
                        border-r
                        border-slate-400
                        px-2
                        text-[11px]
                        text-slate-700
                      "
                    >
                      {customer.lkpGlAccountName}
                    </td>

                    {/* ==================================================
                        MODIFY
                    ================================================== */}

                    <td
                      className="
                        border-b
                        border-r
                        border-slate-400
                        p-0
                        text-center
                        align-middle
                      "
                    >
                      <div className="flex h-full w-full items-center justify-center">

                        <button
                          id="btnModify"
                          type="button"
                          title="Modify"
                          onClick={() => handleModify(customer)}
                          className="
                            flex
                            h-6
                            w-6
                            items-center
                            justify-center
                            rounded-full
                            bg-blue-500
                            text-white
                            hover:bg-blue-600
                            focus:outline-none
                          "
                        >
                          <SquarePen
                            width={15}
                            height={15}
                          />
                        </button>

                      </div>
                    </td>

                    {/* ==================================================
                        DELETE
                    ================================================== */}

                    <td
                      className="
                        h-8
                        border-b
                        border-slate-400
                        p-0
                        text-center
                        align-middle
                      "
                    >

                      <button
                        id="btnDelete"
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(customer)}
                        className="
                          inline-flex
                          h-6
                          w-6
                          items-center
                          justify-center
                          rounded-full
                          text-red-500
                          hover:bg-red-50
                          hover:text-red-600
                          focus:outline-none
                        "
                      >
                        <Trash
                          width={16}
                          height={16}
                        />
                      </button>

                    </td>

                  </tr>
                ))}

                {/* ======================================================
                    NO DATA
                ====================================================== */}

                {filteredCustomers.length === 0 && (

                  <tr>

                    <td
                      colSpan={8}
                      className="
                        h-17.5
                        text-center
                        text-[12px]
                        text-slate-500
                      "
                    >
                      No customers found
                    </td>

                  </tr>

                )}

              </tbody>

            </table>
          </div>
        </div>

        {/* ============================================================
            BOTTOM SPACE
        ============================================================ */}

        <div className="h-2.5" />

      </div>
    </div>
  );
};

export default CustomerList;