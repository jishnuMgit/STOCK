
import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface ParameterOption {
  parameter: string;
  type: string;
}

interface AccountOption {
  accountId: string;
  accountName: string;
}

interface AccountSetting {
  id: number;
  parameter: string;
  accountId: string;
  accountName: string;
  groupHead: string;
}

// ============================================================
// SAMPLE PARAMETER DATA
// Replace with your API data when available.
// ============================================================

const parameterOptions: ParameterOption[] = [
  { parameter: "CASH", type: "G" },
  { parameter: "BANK", type: "G" },
  { parameter: "Cash Sales", type: "G" },
  { parameter: "Receivable 1", type: "G" },
  { parameter: "Payable (Airline)", type: "G" },
  { parameter: "Payable (Tour)", type: "G" },
  { parameter: "Profit & Loss", type: "G" },
];

// ============================================================
// ACCOUNT DATA
// ============================================================

const accountOptions: AccountOption[] = [
  { accountId: "1101001", accountName: "PETTY CASH" },
  { accountId: "1102001", accountName: "AL RAJHI BANK" },
  {
    accountId: "1102002",
    accountName: "SAUDI NATIONAL BANK - SNB",
  },
  {
    accountId: "1102003",
    accountName: "SAUDI BRITISH BANK",
  },
  {
    accountId: "1102004",
    accountName: "BANQUE SAUDI FRANSI - BSF CVN",
  },
  {
    accountId: "1102005",
    accountName: "BSF- REGION ACCOUNT",
  },
  {
    accountId: "1102006",
    accountName: "BANQUE SAUDI FRANSI - BSF ACE",
  },
  { accountId: "1103002", accountName: "ECL ALLOWANCE" },
  {
    accountId: "1104001",
    accountName: "ACE HEAD OFFICE (INTER COMPANY)",
  },
  { accountId: "1105001", accountName: "SKAB GROUP COMPANY" },
  {
    accountId: "1105002",
    accountName: "HERA'A INTERNATIONAL MALL",
  },
  { accountId: "1105003", accountName: "NAJRAN WATER" },
  {
    accountId: "1105004",
    accountName: "MOVEINN JEDDAH HOTEL",
  },
  {
    accountId: "1107001",
    accountName: "COMMISSION RECEIVABLES - SAUDIA",
  },
  { accountId: "1202001", accountName: "ACC. AMORTIZING FOR LEASHOLD" },
  {
    accountId: "1202006",
    accountName: "ACC. DEPR. FOR AIR CONDITIONS",
  },
  {
    accountId: "1202009",
    accountName: "ACC. DEPR. FOR DATA PROCESSING EQUIP",
  },
  {
    accountId: "1202003",
    accountName: "ACC. DEPR. FOR ELECTRICAL EQUIPMENTS",
  },
  {
    accountId: "1202004",
    accountName: "ACC. DEPR. FOR FURNITURE AND DECORATION",
  },
  {
    accountId: "1202005",
    accountName: "ACC. DEPR. FOR IRON SAFES",
  },
  {
    accountId: "1202008",
    accountName: "ACC. DEPR. FOR MOTOR VEHICLES",
  },
  {
    accountId: "1202007",
    accountName: "ACC. DEPR. FOR NEON LIGHT FITTINGS",
  },
  {
    accountId: "1202002",
    accountName: "ACC. DEPR. FOR OFFICE EQUIPMENT",
  },
  {
    accountId: "1202010",
    accountName: "ACC. DEPR. FOR SOFTWARE",
  },
  { accountId: "2103001", accountName: "ACCRUED EXPENSES" },
  { accountId: "2103002", accountName: "ACCRUED OFFICE RENT" },
  { accountId: "6001", accountName: "ABC TRADING" },
];

// ============================================================
// INITIAL TABLE DATA
// ============================================================

const initialData: AccountSetting[] = [
  {
    id: 1,
    parameter: "CASH",
    accountId: "110100",
    accountName: "CASH",
    groupHead: "G",
  },
  {
    id: 2,
    parameter: "BANK",
    accountId: "110200",
    accountName: "BANK",
    groupHead: "G",
  },
  {
    id: 3,
    parameter: "Cash Sales",
    accountId: "110400",
    accountName: "ACE TRAVEL GROUP",
    groupHead: "G",
  },
  {
    id: 4,
    parameter: "Receivable 1",
    accountId: "210201",
    accountName: "ADVANCE FROM CUSTOMERS",
    groupHead: "G",
  },
  {
    id: 5,
    parameter: "Payable (Airline)",
    accountId: "220100",
    accountName: "PROVISIONS",
    groupHead: "G",
  },
  {
    id: 6,
    parameter: "Payable (Tour)",
    accountId: "220200",
    accountName: "EOSB - PROVISIONS",
    groupHead: "G",
  },
  {
    id: 7,
    parameter: "Profit & Loss",
    accountId: "230106",
    accountName: "CURRENT YEAR EARNINGS",
    groupHead: "G",
  },
];

// ============================================================
// DROPDOWN TYPES
// ============================================================

interface DropdownProps {
  value: string;
  placeholder?: string;
  options: ParameterOption[] | AccountOption[];
  kind: "parameter" | "accountId" | "accountName";
  onSelect: (option: ParameterOption | AccountOption) => void;
  menuWidth: number | string;
  firstColumnWidth: number | string;
}

// ============================================================
// REUSABLE DROPDOWN
// ============================================================

const DropdownInput: React.FC<DropdownProps> = ({
  value,
  placeholder,
  options,
  kind,
  onSelect,
  menuWidth,
  firstColumnWidth,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const isParameter = kind === "parameter";
  const isAccountId = kind === "accountId";

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return options;

    return options.filter((option) => {
      if ("parameter" in option) {
        return (
          option.parameter.toLowerCase().includes(search) ||
          option.type.toLowerCase().includes(search)
        );
      }

      return (
        option.accountId.toLowerCase().includes(search) ||
        option.accountName.toLowerCase().includes(search)
      );
    });
  }, [options, query]);

  const handleSelect = (
    option: ParameterOption | AccountOption
  ) => {
    onSelect(option);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative h-full w-full min-w-0">
      <input
        value={open ? query : value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="
          h-full
          w-full
          min-w-0
          border-0
          bg-transparent
          px-[7px]
          pr-5
          text-[11px]
          text-slate-700
          outline-none
          focus:bg-blue-50
        "
      />

      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setOpen((previous) => !previous);
          setQuery("");
        }}
        className="
          absolute
          right-[3px]
          top-1/2
          z-[1]
          flex
          -translate-y-1/2
          items-center
          justify-center
          text-[9px]
          text-slate-500
        "
        aria-label="Toggle dropdown"
      >
        {open ? (
          <ChevronDown size={10} />
        ) : (
          <span>▼</span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-[100] cursor-default bg-transparent"
            onMouseDown={() => {
              setOpen(false);
              setQuery("");
            }}
          />

          <div
            className="
              absolute
              left-0
              top-full
              z-[101]
              max-h-[390px]
              overflow-auto
              border
              border-slate-400
              bg-white
              shadow-[0_4px_8px_rgba(0,0,0,0.20)]
            "
            style={{
              width: menuWidth,
              minWidth: "100%",
              maxWidth: "calc(100vw - 28px)",
            }}
          >
            {/* DROPDOWN HEADERS */}

            <div
              className="sticky top-0 z-[2] grid h-[26px] border-b border-slate-300 bg-[#eeeeee] text-[12px] font-medium text-slate-800"
              style={{
                gridTemplateColumns: isParameter
                  ? `${firstColumnWidth}px minmax(80px, 1fr)`
                  : isAccountId
                    ? `${firstColumnWidth}px minmax(180px, 1fr)`
                    : `minmax(180px, 1fr) ${firstColumnWidth}px`,
              }}
            >
              {isParameter ? (
                <>
                  <div className="flex items-center px-[7px]">
                    Parameter
                  </div>
                  <div className="flex items-center px-[7px]">
                    Type
                  </div>
                </>
              ) : isAccountId ? (
                <>
                  <div className="flex items-center px-[7px]">
                    Account ID
                  </div>
                  <div className="flex items-center px-[7px]">
                    Account Name
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center px-[7px]">
                    Account Name
                  </div>
                  <div className="flex items-center px-[7px]">
                    Account ID
                  </div>
                </>
              )}
            </div>

            {/* DROPDOWN OPTIONS */}

            {filteredOptions.map((option, index) => {
              if ("parameter" in option) {
                return (
                  <button
                    type="button"
                    key={`${option.parameter}-${index}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                    className="
                      grid
                      min-h-[27px]
                      w-full
                      border-b
                      border-slate-100
                      text-left
                      text-[12px]
                      text-slate-700
                      hover:bg-[#e8f7f0]
                    "
                    style={{
                      gridTemplateColumns: `${firstColumnWidth}px minmax(80px, 1fr)`,
                    }}
                  >
                    <span className="truncate px-[7px] py-[5px]">
                      {option.parameter}
                    </span>
                    <span className="truncate px-[7px] py-[5px]">
                      {option.type}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  key={`${option.accountId}-${index}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className="
                    grid
                    min-h-[27px]
                    w-full
                    border-b
                    border-slate-100
                    text-left
                    text-[12px]
                    text-slate-700
                    hover:bg-[#e8f7f0]
                  "
                  style={{
                    gridTemplateColumns: isAccountId
                      ? `${firstColumnWidth}px minmax(180px, 1fr)`
                      : `minmax(180px, 1fr) ${firstColumnWidth}px`,
                  }}
                >
                  {isAccountId ? (
                    <>
                      <span className="truncate px-[7px] py-[5px]">
                        {option.accountId}
                      </span>
                      <span className="truncate px-[7px] py-[5px]">
                        {option.accountName}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="truncate px-[7px] py-[5px]">
                        {option.accountName}
                      </span>
                      <span className="truncate px-[7px] py-[5px]">
                        {option.accountId}
                      </span>
                    </>
                  )}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-[11px] text-slate-500">
                No matching records found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const COASettings: React.FC = () => {
  const [rows, setRows] = useState<AccountSetting[]>(initialData);
  const [selectedRow, setSelectedRow] = useState<number>(1);

  const [parameter, setParameter] = useState("CASH");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [groupHead, setGroupHead] = useState("G");

  // ----------------------------------------------------------
  // UPDATE A TABLE ROW
  // ----------------------------------------------------------

  const updateRow = (
    id: number,
    field: keyof AccountSetting,
    value: string
  ) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  // ----------------------------------------------------------
  // SELECT TABLE ROW
  // ----------------------------------------------------------

  const handleSelectRow = (row: AccountSetting) => {
    setSelectedRow(row.id);
    setParameter(row.parameter);
    setAccountId(row.accountId);
    setAccountName(row.accountName);
    setGroupHead(row.groupHead);
  };

  // ----------------------------------------------------------
  // SELECT PARAMETER
  // ----------------------------------------------------------

  const handleSelectParameter = (option: ParameterOption) => {
    setParameter(option.parameter);
    setGroupHead(option.type);
  };

  // ----------------------------------------------------------
  // SELECT ACCOUNT
  // ----------------------------------------------------------

  const handleSelectAccount = (option: AccountOption) => {
    setAccountId(option.accountId);
    setAccountName(option.accountName);
  };

  // ----------------------------------------------------------
  // CLEAR FORM
  // ----------------------------------------------------------

  const handleClear = () => {
    setSelectedRow(0);
    setParameter("");
    setAccountId("");
    setAccountName("");
    setGroupHead("G");
  };

  // ----------------------------------------------------------
  // SAVE
  // ----------------------------------------------------------

  const handleSave = () => {
    if (!parameter.trim()) {
      alert("Please select a parameter.");
      return;
    }

    if (selectedRow !== 0) {
      setRows((previous) =>
        previous.map((row) =>
          row.id === selectedRow
            ? {
                ...row,
                parameter,
                accountId,
                accountName,
                groupHead,
              }
            : row
        )
      );

      alert("Account setting updated.");
      return;
    }

    const newId = Math.max(0, ...rows.map((row) => row.id)) + 1;

    const newRow: AccountSetting = {
      id: newId,
      parameter,
      accountId,
      accountName,
      groupHead,
    };

    setRows((previous) => [...previous, newRow]);
    setSelectedRow(newId);

    alert("Account setting added.");
  };

  // ----------------------------------------------------------
  // STYLES
  // ----------------------------------------------------------

  const cellClass = "h-[30px] border-r border-[#c8eadb] p-0";

  const inputClass =
    "h-full w-full min-w-0 border-0 bg-transparent px-[7px] text-[11px] text-slate-700 outline-none focus:bg-blue-50";

  // ----------------------------------------------------------
  // KEEP A MINIMUM OF 10 VISIBLE ROWS
  // ----------------------------------------------------------

  const displayRows = Array.from(
    { length: Math.max(10, rows.length) },
    (_, index) => rows[index] ?? null
  );

  return (
    <div className="mx-auto min-h-screen w-full bg-white p-[1px] font-sans text-slate-700">
      <div className="min-h-[444px] w-full overflow-visible border border-slate-400 bg-white">
        {/* TITLE */}

        <div className="flex h-[33px] items-center justify-center border-b border-[#83d8b2] bg-[#9ee0bf]">
          <h1
            id="ChartOfAccountSettings"
            className="text-[20px] font-semibold leading-none tracking-tight"
          >
            <span className="rounded-[5px] bg-yellow-300 px-[5px] py-[2px] text-black">
              Chart
            </span>
            <span className="ml-[3px] text-slate-700">
              Of Account Settings
            </span>
          </h1>
        </div>

        {/* TABLE */}

        <div className="mx-[25px] mt-0 overflow-x-auto">
          <div className="min-w-[760px]">
            {/* TABLE HEADER */}

            <div className="grid grid-cols-[18px_34px_266px_120px_minmax(180px,1fr)_98px] border-b border-[#b9e8d2] bg-[#eef9f3] text-[12px] font-medium text-slate-600">
              <div className="h-[30px] border-r border-[#c8eadb]" />

              <div className="flex h-[30px] items-center justify-center border-r border-[#c8eadb]">
                Sl.
              </div>

              <div className="flex h-[30px] items-center border-r border-[#c8eadb] px-[7px]">
                Parameter
              </div>

              <div className="flex h-[30px] items-center border-r border-[#c8eadb] px-[7px]">
                Account ID
              </div>

              <div className="flex h-[30px] items-center border-r border-[#c8eadb] px-[7px]">
                Account Name
              </div>

              <div className="flex h-[30px] items-center px-[5px]">
                Group/Head
              </div>
            </div>

            {/* TABLE BODY */}

            {displayRows.map((row, index) => {
              const isSelected =
                row !== null && selectedRow === row.id;

              return (
                <div
                  key={row?.id ?? `empty-${index}`}
                  onClick={() => row && handleSelectRow(row)}
                  className={`grid grid-cols-[18px_34px_266px_120px_minmax(180px,1fr)_98px] border-b border-[#b9e8d2] text-[11px] ${
                    isSelected ? "bg-[#f5fcf8]" : "bg-white"
                  }`}
                >
                  {/* ROW SELECTOR */}

                  <div className="flex h-[30px] items-center justify-center border-r border-[#c8eadb]">
                    {isSelected && (
                      <ChevronRight
                        size={11}
                        strokeWidth={2.5}
                        className="text-black"
                      />
                    )}
                  </div>

                  {/* SERIAL */}

                  <div className="flex h-[30px] items-center justify-center border-r border-[#c8eadb]">
                    {row?.id ?? ""}
                  </div>

                  {/* PARAMETER */}

                  <div className={cellClass}>
                    {row && (
                      <input
                        aria-label={`Parameter ${row.id}`}
                        value={row.parameter}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "parameter",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    )}
                  </div>

                  {/* ACCOUNT ID */}

                  <div className={cellClass}>
                    {row && (
                      <input
                        aria-label={`Account ID ${row.id}`}
                        value={row.accountId}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "accountId",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    )}
                  </div>

                  {/* ACCOUNT NAME */}

                  <div className={cellClass}>
                    {row && (
                      <input
                        aria-label={`Account Name ${row.id}`}
                        value={row.accountName}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "accountName",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    )}
                  </div>

                  {/* GROUP / HEAD */}

                  <div className="h-[30px]">
                    {row && (
                      <input
                        aria-label={`Group Head ${row.id}`}
                        value={row.groupHead}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "groupHead",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ENTRY SECTION */}

        <div className="relative mx-[25px] min-h-[74px] min-w-[760px]">
          <div className="grid grid-cols-[18px_34px_266px_120px_minmax(180px,1fr)_98px]">
            <div className="col-span-2" />

            {/* PARAMETER DROPDOWN */}

            <div className="relative h-[30px]">
              <DropdownInput
                value={parameter}
                placeholder="(lkpParameter)"
                kind="parameter"
                options={parameterOptions}
                menuWidth="700px"
                firstColumnWidth={266}
                onSelect={(option) => {
                  if ("parameter" in option) {
                    handleSelectParameter(option);
                  }
                }}
              />
            </div>

            {/* ACCOUNT ID DROPDOWN */}

            <div className="relative h-[30px]">
              <DropdownInput
                value={accountId}
                placeholder="(lkpAccountID)"
                kind="accountId"
                options={accountOptions}
                menuWidth="660px"
                firstColumnWidth={120}
                onSelect={(option) => {
                  if ("accountId" in option) {
                    handleSelectAccount(option);
                  }
                }}
              />
            </div>

            {/* ACCOUNT NAME DROPDOWN */}

            <div className="relative h-[30px]">
              <DropdownInput
                value={accountName}
                placeholder="(lkpAccountName)"
                kind="accountName"
                options={accountOptions}
                menuWidth="660px"
                firstColumnWidth={120}
                onSelect={(option) => {
                  if ("accountId" in option) {
                    handleSelectAccount(option);
                  }
                }}
              />
            </div>

            {/* GROUP / HEAD */}

            <div className="h-[30px]">
              <input
                id="txtGroupHead"
                value={groupHead}
                onChange={(event) => setGroupHead(event.target.value)}
                placeholder="(txtGroup/Head)"
                className={`${inputClass} text-[14px] text-red-700 placeholder:text-red-700`}
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}

          <div className="absolute left-1/2 top-[9px] z-[1] flex -translate-x-1/2 gap-[12px]">
            <button
              id="btnSave"
              type="button"
              onClick={handleSave}
              className="h-[40px] w-[107px] rounded-[4px] border border-[#9bb7cc] bg-gradient-to-b from-white to-[#e2ebf2] text-[14px] text-green-700 shadow-sm hover:from-[#f4fff7] hover:to-[#d4ebdc] focus:outline-none focus:ring-1 focus:ring-green-400"
            >
              <span className="underline underline-offset-[3px]">
                Save
              </span>
            </button>

            <button
              id="btnClear"
              type="button"
              onClick={handleClear}
              className="h-[40px] w-[107px] rounded-[4px] border border-[#9bb7cc] bg-gradient-to-b from-white to-[#e2ebf2] text-[14px] text-green-700 shadow-sm hover:from-[#f4fff7] hover:to-[#d4ebdc] focus:outline-none focus:ring-1 focus:ring-green-400"
            >
              <span className="underline underline-offset-[3px]">
                Clear
              </span>
            </button>
          </div>
        </div>

        <div className="h-[1px]" />
      </div>
    </div>
  );
};

export default COASettings;