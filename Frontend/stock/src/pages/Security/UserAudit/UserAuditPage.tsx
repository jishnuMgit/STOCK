import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Select, {
  type StylesConfig,
} from "react-select";

import dayjs from "dayjs";


import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

// ============================================================
// SELECT STYLE
// The project's User ID select - the same box as on the User Permission
// pages (itself the Company page select): 30px, light border, mint when
// focused, 11px text. classNamePrefix="userIdSelect" on the User ID box gives
// its list the thick dark scrollbar defined in index.css.
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
    fontSize: "11px",
    cursor: "pointer",

    "&:hover": {
      borderColor: "#9fdfbc",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "23px",
    minHeight: "23px",
    padding: "0 6px",
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    color: "#374151",
    fontSize: "11px",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#808080",
    fontSize: "11px",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "11px",
    color: "#374151",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "23px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",

    "&:hover": {
      color: "#808080",
    },
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),

  menu: (base) => ({
    ...base,
    fontSize: "12px",
    zIndex: 9999,
    marginTop: "2px",
    borderRadius: "4px",
    overflow: "hidden",
  }),

  // the height of the open list is the select's maxMenuHeight; the scrollbar
  // track is always shown, even when everything fits (as on the User Permission
  // pages)
  menuList: (base) => ({
    ...base,
    padding: "3px 0",
    overflowY: "scroll",
  }),

  option: (base, state) => ({
    ...base,
    fontSize: "12px",
    cursor: "pointer",

    backgroundColor:
      state.isSelected || state.isFocused ? "#eefbf4" : "#ffffff",

    color: "#344054",
    padding: "7px 10px",

    "&:active": {
      backgroundColor: "#dff5e9",
    },
  }),
};

// ============================================================
// COMPONENT
// ============================================================

const SQL_DATE = "YYYY-MM-DD";

// the "All" choice at the top of the User ID and Action lists (the server reads
// it as every user / every action)
const ALL_CHOICE = "*";

// dbo.tblmenu fmenuid of the User Audit page - its one button is Print
const MENU_ID = "9304";

const UserAudit: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);
  const navigate = useNavigate();

  // Back from the print page brings you here with what you had picked. It
  // travels in the browser's navigation state (not in the address), so the
  // address stays clean.
  const location = useLocation();
  const picked = (location.state ?? {}) as Partial<{
    lkpUserID: string;
    lkpAction: string;
    dtpFromDate: string;
    dtpToDate: string;
  }>;

  // ==========================================================
  // THE DIALOG: user, action, period
  // both are chosen before Print (the "All" choice counts); empty = "Select..."
  // ==========================================================

  const [lkpUserID, setLkpUserID] = useState<string>(
    picked.lkpUserID ?? "",
  );
  const [lkpAction, setLkpAction] = useState<string>(
    picked.lkpAction ?? "",
  );

  // yyyy-mm-dd (what the server takes); the pickers show dd-mm-yyyy
  const [dtpFromDate, setDtpFromDate] = useState<string>(
    picked.dtpFromDate ?? dayjs().startOf("month").format(SQL_DATE),
  );
  const [dtpToDate, setDtpToDate] = useState<string>(
    picked.dtpToDate ?? dayjs().format(SQL_DATE),
  );

  const [userOptions, setUserOptions] = useState<Option[]>([]);
  const [actionOptions, setActionOptions] = useState<Option[]>([]);

  // ==========================================================
  // REFS
  // ==========================================================

  const fromDateRef = useRef<HTMLInputElement | null>(null);
  const toDateRef = useRef<HTMLInputElement | null>(null);

  // ==========================================================
  // LOAD THE USER AND ACTION LISTS
  // The server gives an Admin User every user, anyone else only themselves.
  // ==========================================================

  useEffect(() => {
    const loadLists = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getUserList: no PstrCoID in localStorage");
          return;
        }

        const api = import.meta.env.VITE_API_URL;

        const [userResponse, actionResponse] = await Promise.all([
          fetch(`${api}/UserAudit/getUserList?PstrCoID=${PstrCoID}`, {
            credentials: "include",
          }),
          fetch(`${api}/UserAudit/getActionList`, { credentials: "include" }),
        ]);

        const userResult = await userResponse.json();
        const actionResult = await actionResponse.json();

        if (!userResponse.ok || !userResult.success) {
          toast.error(`getUserList failed: ${userResult.message}`);
          return;
        }

        if (!actionResponse.ok || !actionResult.success) {
          toast.error(`getActionList failed: ${actionResult.message}`);
          return;
        }

        setUserOptions(
          (userResult.data || []).map((user: { lkpUserID: string }) => ({
            value: user.lkpUserID,
            label: user.lkpUserID,
          })),
        );

        setActionOptions(
          (actionResult.data || []).map(
            (action: { lkpAction: string; txtActionName: string }) => ({
              value: action.lkpAction,
              label: action.txtActionName,
            }),
          ),
        );
      } catch (error) {
        console.error("loadUserAuditLists error:", error);
        toast.error(
          `User Audit load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadLists();
  }, []);

  // the lists the boxes show: "All" first, then what the server gave
  const userChoices: Option[] = [
    { value: ALL_CHOICE, label: "All" },
    ...userOptions,
  ];

  const actionChoices: Option[] = [
    { value: ALL_CHOICE, label: "All" },
    ...actionOptions,
  ];

  // put the cursor in a box by its name (the server names the failing box the
  // same way as the element id)
  const focusField = (field?: string) => {
    if (field === "dtpFromDate") {
      fromDateRef.current?.focus();
    } else if (field === "dtpToDate") {
      toDateRef.current?.focus();
    } else if (field) {
      document.getElementById(field)?.focus();
    }
  };

  // ==========================================================
  // PRINT - checks the dialog, then opens the print page with what you picked.
  // The print page asks the server for the report. The same rules as the
  // server (which is the one that counts): both dates, and From not later
  // than To.
  // ==========================================================

  const handlePrint = () => {
    if (!perms.print) {
      toast.error("You do not have permission to Print.");
      return;
    }

    if (lkpUserID === "") {
      toast.warning("Please select 'User ID'");
      focusField("lkpUserID");
      return;
    }

    if (lkpAction === "") {
      toast.warning("Please select 'Action'");
      focusField("lkpAction");
      return;
    }

    if (dtpFromDate === "") {
      toast.warning("Please input 'From Date'");
      focusField("dtpFromDate");
      return;
    }

    if (dtpToDate === "") {
      toast.warning("Please input 'To Date'");
      focusField("dtpToDate");
      return;
    }

    // yyyy-mm-dd text compares in date order
    if (dtpFromDate > dtpToDate) {
      toast.warning("'From Date' should be less than or equal to 'To Date'");
      focusField("dtpFromDate");
      return;
    }

    const filters = { lkpUserID, lkpAction, dtpFromDate, dtpToDate };

    // first keep what you picked in THIS page's history entry (it replaces the
    // current entry, no new one), then go to the print page with the same:
    // the browser's Back from there comes to this dialog with the boxes filled
    navigate("/Security/UserAudit", { replace: true, state: filters });
    navigate("/Security/UserAudit/Print", { state: filters });
  };

  // ==========================================================
  // CLEAR - the dialog back to its start
  // ==========================================================

  const handleClear = () => {
    // forget what was kept for Back, too
    navigate("/Security/UserAudit", { replace: true, state: null });

    setLkpUserID("");
    setLkpAction("");
    setDtpFromDate(dayjs().startOf("month").format(SQL_DATE));
    setDtpToDate(dayjs().format(SQL_DATE));

    requestAnimationFrame(() => {
      document.getElementById("lkpUserID")?.focus();
    });
  };

  // Alt+P -> Print, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    p: handlePrint,
    c: handleClear,
  });

  // The old form's behaviour: Enter on a BUTTON presses it. Enter anywhere
  // else moves on to the next box, as on the other pages.
  const handlePageKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (event.key === "Enter" && target.tagName === "BUTTON") {
      event.preventDefault();
      target.click();
      return;
    }

    handleEnterAsTab(event);
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      onKeyDown={handlePageKeyDown}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      <div className="w-[420px] border border-slate-400 bg-white shadow-sm">
        {/* ====================================================
            TITLE
        ==================================================== */}

        <header className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            User Audit
          </h1>
        </header>

        {/* ====================================================
            FORM
        ==================================================== */}

        <div className="p-[12px] m-[12px]">
          {/* USER ID  (a user, or All) */}

          <section className="mb-[8px] flex items-center gap-2">
            <label
              htmlFor="lkpUserID"
              className="w-[84px] shrink-0 pr-3 text-right text-[14px] text-gray-600"
            >
              User ID :
            </label>

            <div className="min-w-0 flex-1">
              <Select<Option, false>
                inputId="lkpUserID"
                instanceId="lkpUserID"
                name="lkpUserID"
                options={userChoices}
                value={
                  userChoices.find((option) => option.value === lkpUserID) ??
                  null
                }
                onChange={(option) => setLkpUserID(option?.value ?? "")}
                styles={selectStyles}
                classNamePrefix="userIdSelect"
                isClearable={false}
                isSearchable
                placeholder="Select..."
                noOptionsMessage={() => "No User Found"}
                // 14 rows (an option is about 32px) before the list scrolls
                maxMenuHeight={448}
                menuPosition="fixed"
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : undefined
                }
              />
            </div>
          </section>

          {/* ACTION  (an action, or All) */}

          <section className="mb-[8px] flex items-center gap-2">
            <label
              htmlFor="lkpAction"
              className="w-[84px] shrink-0 pr-3 text-right text-[14px] text-gray-600"
            >
              Action :
            </label>

            <div className="w-[140px]">
              <Select<Option, false>
                inputId="lkpAction"
                instanceId="lkpAction"
                name="lkpAction"
                options={actionChoices}
                value={
                  actionChoices.find((option) => option.value === lkpAction) ??
                  null
                }
                onChange={(option) => setLkpAction(option?.value ?? "")}
                styles={selectStyles}
                classNamePrefix="userIdSelect"
                isClearable={false}
                isSearchable={false}
                placeholder="Select..."
                menuPosition="fixed"
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : undefined
                }
              />
            </div>
          </section>

          {/* PERIOD */}

          <section className="mb-[8px] flex items-center gap-2">
            <label
              htmlFor="dtpFromDate"
              className="w-[84px] shrink-0 pr-3 text-right text-[14px] text-gray-600"
            >
              Period :
            </label>

            <input
              id="dtpFromDate"
              name="dtpFromDate"
              type="date"
              ref={fromDateRef}
              value={dtpFromDate}
              onChange={(event) => setDtpFromDate(event.target.value)}
              className="input-style w-[130px]"
            />

            <input
              id="dtpToDate"
              name="dtpToDate"
              type="date"
              ref={toDateRef}
              value={dtpToDate}
              onChange={(event) => setDtpToDate(event.target.value)}
              className="input-style w-[130px]"
            />
          </section>

          {/* ====================================================
              BUTTONS
          ==================================================== */}

          <div className="mt-[14px] flex justify-center gap-3">
            {/* PRINT - opens the print page */}
            <button
              id="btnPrint"
              name="btnPrint"
              type="button"
              onClick={handlePrint}
              disabled={!perms.print}
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
            >
              <u>P</u>rint
            </button>

            {/* CLEAR */}
            <button
              id="btnClear"
              name="btnClear"
              type="button"
              onClick={handleClear}
              className="btn-style"
            >
              <u>C</u>lear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAudit;
