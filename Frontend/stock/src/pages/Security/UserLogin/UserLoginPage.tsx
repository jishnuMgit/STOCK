import React, { useEffect, useRef, useState } from "react";
import Select, { type SingleValue } from "react-select";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import { useConfirm } from "../../../hooks/useConfirm";

// ============================================================
// TYPES
// ============================================================

interface UserRow {
  txtOriginal_UserID: string; // "" = new user, otherwise the saved User ID
  txtUserID: string;
  txtUserName: string;
  txtPwd: string;
  txtConfirmPwd: string;
  lkpUserType: string;
  lkpUserStatus: string;
}

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================
// EMPTY USER
// ============================================================

const createEmptyUser = (): UserRow => ({
  txtOriginal_UserID: "",
  txtUserID: "",
  txtUserName: "",
  txtPwd: "",
  txtConfirmPwd: "",
  lkpUserType: "",
  lkpUserStatus: "",
});

// ============================================================
// BUTTON CLASS
// ============================================================

const buttonClass = "btn-style";

// ============================================================
// SELECT STYLE
// ============================================================

const selectStyles = {
  // ==========================================================
  // CONTROL
  // ==========================================================

  control: (base: any) => ({
    ...base,
    minHeight: "23px",
    height: "23px",
    width: "100%",
    border: "none",
    borderRadius: "0px",
    boxShadow: "none",
    backgroundColor: "transparent",
    fontSize: "12px",
    cursor: "pointer",
  }),

  // ==========================================================
  // VALUE CONTAINER
  // ==========================================================

  valueContainer: (base: any) => ({
    ...base,
    height: "23px",
    padding: "0px",
  }),

  // ==========================================================
  // SELECTED VALUE
  // ==========================================================

  singleValue: (base: any) => ({
    ...base,
    fontSize: "12px",
    color: "#1e293b",
    margin: "0px",
  }),

  // ==========================================================
  // PLACEHOLDER
  // ==========================================================

  placeholder: (base: any) => ({
    ...base,
    fontSize: "12px",
    color: "#94a3b8",
    margin: "0px",
  }),

  // ==========================================================
  // INPUT
  // ==========================================================

  input: (base: any) => ({
    ...base,
    margin: "0px",
    padding: "0px",
    fontSize: "12px",
  }),

  // ==========================================================
  // INDICATORS CONTAINER
  // ==========================================================

  indicatorsContainer: (base: any) => ({
    ...base,
    height: "23px",
  }),

  // ==========================================================
  // DROPDOWN ARROW
  // ==========================================================

  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "2px",
  }),

  // ==========================================================
  // REMOVE X ICON
  // ==========================================================

  clearIndicator: () => ({
    display: "none",
  }),

  // ==========================================================
  // REMOVE VERTICAL SEPARATOR
  // ==========================================================

  indicatorSeparator: () => ({
    display: "none",
  }),

  // ==========================================================
  // MENU
  // ==========================================================

  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
    fontSize: "12px",
    marginTop: "1px",
  }),

  // ==========================================================
  // MENU LIST
  // ==========================================================

  menuList: (base: any) => ({
    ...base,
    padding: "2px 0px",
    maxHeight: "150px",
  }),

  // ==========================================================
  // OPTION
  // ==========================================================

  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    padding: "5px 8px",
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "#dcefe5"
      : state.isFocused
        ? "#f0faf5"
        : "#ffffff",
    color: "#1e293b",
  }),
};

// ============================================================
// COMPONENT
// ============================================================

// dbo.tblmenu fmenuid for the User Login page.
const MENU_ID = "9301";

const UserLogin: React.FC = () => {
  const perms = useButtonPermissions(MENU_ID);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userTypeOptions, setUserTypeOptions] = useState<SelectOption[]>([]);
  const [userStatusOptions, setUserStatusOptions] = useState<SelectOption[]>([]);

  const handleEnterAsTab = useEnterAsTab();
  const { confirm, confirmDialog } = useConfirm();

  // ============================================================
  // WHAT EACH SAVED USER LOOKED LIKE WHEN LOADED
  // (so Save only sends new or changed rows)
  // ============================================================

  const loadedRowsRef = useRef<Record<string, string>>({});

  const rowSignature = (row: UserRow) =>
    `${row.txtUserName}|${row.lkpUserType}|${row.lkpUserStatus}`;

  // ============================================================
  // TOTAL VISIBLE ROWS
  // ============================================================

  const totalRows = 18;

  // ============================================================
  // GET DISPLAY ROWS (always at least totalRows, grows with users)
  // ============================================================

  const displayUsers = Array.from(
    { length: Math.max(totalRows, users.length) },
    (_, index) => users[index] ?? createEmptyUser()
  );

  // ============================================================
  // LOAD USER LOGINS (mode 'G')
  // ============================================================

  const loadUsers = async () => {
    try {
      const PstrCoID = localStorage.getItem("PstrCoID");
      const PstrUserID = localStorage.getItem("PstrUserID");

      if (!PstrCoID || !PstrUserID) {
        toast.error("Company ID / User ID not found. Please log in again.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/UserLogin/getUserLoginList?PstrCoID=${encodeURIComponent(PstrCoID)}&PstrUserID=${encodeURIComponent(PstrUserID)}`,
        { method: "GET" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "User logins could not be loaded.");
        return;
      }

      const rows: UserRow[] = result.data.map(
        (row: {
          txtUserID: string;
          txtUserName: string;
          lkpUserType: string;
          lkpUserStatus: string;
        }) => ({
          txtOriginal_UserID: row.txtUserID,
          txtUserID: row.txtUserID,
          txtUserName: row.txtUserName,
          txtPwd: "",
          txtConfirmPwd: "",
          lkpUserType: row.lkpUserType,
          lkpUserStatus: row.lkpUserStatus,
        })
      );

      loadedRowsRef.current = Object.fromEntries(
        rows.map((row) => [row.txtOriginal_UserID, rowSignature(row)])
      );

      setUsers(rows);
    } catch (error) {
      console.error("getUserLoginList error:", error);
      toast.error("Cannot connect to User Login API.");
    }
  };

  // ============================================================
  // PAGE LOAD - dropdown lists (dbo.tbluserparam) + user logins
  // ============================================================

  useEffect(() => {
    const loadPage = async () => {
      const PstrCoID = localStorage.getItem("PstrCoID");

      if (!PstrCoID) {
        return;
      }

      const toTypeOptions = (
        rows: { lkpUserType: string; txtUserTypeName: string }[]
      ) =>
        rows.map((row) => ({
          value: row.lkpUserType,
          label: row.txtUserTypeName,
        }));

      const toStatusOptions = (
        rows: { lkpUserStatus: string; txtUserStatusName: string }[]
      ) =>
        rows.map((row) => ({
          value: row.lkpUserStatus,
          label: row.txtUserStatusName,
        }));

      try {
        const [typeResponse, statusResponse] = await Promise.all([
          fetch(
            `${import.meta.env.VITE_API_URL}/UserLogin/getUserTypeList?PstrCoID=${encodeURIComponent(PstrCoID)}`
          ),
          fetch(
            `${import.meta.env.VITE_API_URL}/UserLogin/getUserStatusList?PstrCoID=${encodeURIComponent(PstrCoID)}`
          ),
        ]);

        const typeResult = await typeResponse.json();
        const statusResult = await statusResponse.json();

        if (typeResult.success) {
          setUserTypeOptions(toTypeOptions(typeResult.data));
        }

        if (statusResult.success) {
          setUserStatusOptions(toStatusOptions(statusResult.data));
        }
      } catch (error) {
        console.error("user type / status list error:", error);
        toast.error("Cannot connect to User Login API.");
      }

      await loadUsers();
    };

    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // UPDATE CELL
  // ============================================================

  const handleChange = (
    rowIndex: number,
    field: keyof UserRow,
    value: string
  ) => {
    setUsers((previous) => {
      const updatedUsers = [...previous];

      while (updatedUsers.length <= rowIndex) {
        updatedUsers.push(createEmptyUser());
      }

      updatedUsers[rowIndex] = {
        ...updatedUsers[rowIndex],
        [field]: value,
      };

      return updatedUsers;
    });
  };

  // ============================================================
  // USER TYPE CHANGE
  // ============================================================

  const handleUserTypeChange = (
    rowIndex: number,
    option: SingleValue<SelectOption>
  ) => {
    handleChange(
      rowIndex,
      "lkpUserType",
      option?.value ?? ""
    );
  };

  // ============================================================
  // USER STATUS CHANGE
  // ============================================================

  const handleUserStatusChange = (
    rowIndex: number,
    option: SingleValue<SelectOption>
  ) => {
    handleChange(
      rowIndex,
      "lkpUserStatus",
      option?.value ?? ""
    );
  };

  // ============================================================
  // SAVE (mode 'S' new user / 'M' existing user)
  // ============================================================

  const handleSave = async () => {
    if (!perms.save) {
      toast.error("You do not have permission to Save.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrUserID) {
      toast.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    const isFilled = (user: UserRow) =>
      user.txtUserID.trim() !== "" ||
      user.txtUserName.trim() !== "" ||
      user.txtPwd !== "" ||
      user.txtConfirmPwd !== "" ||
      user.lkpUserType !== "" ||
      user.lkpUserStatus !== "";

    // only new users and users that were changed
    const rows = users.filter((user) => {
      if (!isFilled(user)) {
        return false;
      }

      if (!user.txtOriginal_UserID) {
        return true;
      }

      return (
        user.txtPwd !== "" ||
        user.txtConfirmPwd !== "" ||
        loadedRowsRef.current[user.txtOriginal_UserID] !== rowSignature(user)
      );
    });

    if (rows.length === 0) {
      toast.info("There are no changes to save.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/UserLogin/saveUserLoginList`,
        {
          method: "POST",
          credentials: "include", // the server checks the session, idle and rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ PstrCoID, PstrUserID, rows }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "User logins could not be saved.");

        // the backend names the field that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "User logins saved successfully.");

      await loadUsers();
    } catch (error) {
      console.error("saveUserLoginList error:", error);
      toast.error("Cannot connect to User Login API.");
    }
  };

  // ============================================================
  // DELETE ONE USER (mode 'D1')
  // ============================================================

  const handleDeleteRow = async (rowIndex: number) => {
    const row = users[rowIndex];

    if (!row) {
      return;
    }

    // never saved - just drop the row (no server call, so no
    // permission needed - there's nothing to delete yet)
    if (!row.txtOriginal_UserID) {
      setUsers((previous) => previous.filter((_, index) => index !== rowIndex));
      return;
    }

    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    const shouldDelete = await confirm("Are you sure you want to delete?");

    if (!shouldDelete) {
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/UserLogin/deleteUserLoginRow`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session, idle and rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            txtUserID: row.txtOriginal_UserID,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "User could not be deleted.");

        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "User deleted successfully.");

      await loadUsers();
    } catch (error) {
      console.error("deleteUserLoginRow error:", error);
      toast.error("Cannot connect to User Login API.");
    }
  };

  // ============================================================
  // CLEAR (discard unsaved edits - reload from the database)
  // ============================================================

  const handleClear = () => {
    loadUsers();
  };

  // ============================================================
  // KEYBOARD SHORTCUTS
  // Alt+S -> Save, Alt+C -> Clear (matches the underlined
  // accelerator letters on the buttons).
  // ============================================================

  useAltShortcuts({
    s: handleSave,
    c: handleClear,
  });

  // ============================================================
  // INPUT CLASS
  // ============================================================

  const inputClass = `
    h-[23px]
    w-full
    border-none
    bg-transparent
    px-0
    text-[12px]
    text-slate-800
    outline-none
  `;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      {/* ============================================================
          MAIN CONTAINER
      ============================================================ */}

      {/* no overflow-hidden on the card: the dropdown lists must stay visible */}
      <div className="w-[1000px] max-w-full border border-slate-400 bg-white shadow-sm">
        {/* ============================================================
            TITLE
        ============================================================ */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            User Login
          </h1>
        </div>

        {/* ============================================================
            FORM
        ============================================================ */}

        <div className="p-[12px] m-[12px]">

        {/* ============================================================
            TABLE
        ============================================================ */}

        <div
          className="
            overflow-hidden
            border
            border-[#b7e8cf]
          "
        >
          <table
            className="
              w-full
              table-fixed
              border-collapse
            "
          >
            {/* ======================================================
                HEADER
            ====================================================== */}

            <thead>
              <tr
                className="
                  h-[30px]
                  bg-[#f0faf5]
                "
              >
                <th
                  className="
                    w-[17%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[14px]
                    font-normal
                    whitespace-nowrap
                    text-gray-600
                  "
                >
                  User ID
                </th>

                <th
                  className="
                    w-[25%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[14px]
                    font-normal
                    whitespace-nowrap
                    text-gray-600
                  "
                >
                  User Name
                </th>

                <th
                  className="
                    w-[14%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[14px]
                    font-normal
                    text-gray-600
                  "
                >
                  Password
                </th>

                <th
                  className="
                    w-[19%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[14px]
                    font-normal
                    whitespace-nowrap
                    text-gray-600
                  "
                >
                  Confirm Password
                </th>

                <th
                  className="
                    w-[15%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[14px]
                    font-normal
                    whitespace-nowrap
                    text-gray-600
                  "
                >
                  User Type
                </th>

                <th
                  className="
                    w-[10%]
                    border-b
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[14px]
                    font-normal
                    whitespace-nowrap
                    text-gray-600
                  "
                >
                  User Status
                </th>
              </tr>
            </thead>

            {/* ======================================================
                BODY
            ====================================================== */}

            <tbody>
              {displayUsers.map((user, index) => (
                <tr
                  key={index}
                  className="h-[25px]"
                >
                  {/* USER ID */}

                  <td
                    className="
                      border-b
                      border-r
                      border-[#b7e8cf]
                      px-2
                    "
                  >
                    <div className="flex h-full items-center gap-1">
                      <input
                        id={`txtUserID-${index}`}
                        type="text"
                        value={user.txtUserID}
                        onChange={(e) =>
                          handleChange(
                            index,
                            "txtUserID",
                            e.target.value
                          )
                        }
                        maxLength={30}
                        readOnly={user.txtOriginal_UserID !== ""}
                        autoComplete="off"
                        className={inputClass}
                      />

                      {user.txtUserID.trim() !== "" &&
                        (user.txtOriginal_UserID === "" || perms.delete) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="
                            inline-flex
                            h-[23px]
                            w-[16px]
                            shrink-0
                            items-center
                            justify-center
                            rounded
                            text-[#999999]
                            hover:text-red-600
                          "
                          aria-label={`Delete ${user.txtUserID}`}
                        >
                          <X
                            size={10}
                            style={{ transform: "translateY(-3px)" }}
                          />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* USER NAME */}

                  <td
                    className="
                      border-b
                      border-r
                      border-[#b7e8cf]
                      px-2
                    "
                  >
                    <input
                      id={`txtUserName-${index}`}
                      type="text"
                      value={user.txtUserName}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "txtUserName",
                          e.target.value
                        )
                      }
                      maxLength={60}
                      className={inputClass}
                    />
                  </td>

                  {/* PASSWORD */}

                  <td
                    className="
                      border-b
                      border-r
                      border-[#b7e8cf]
                      px-2
                    "
                  >
                    <input
                      id={`txtPwd-${index}`}
                      type="password"
                      value={user.txtPwd}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "txtPwd",
                          e.target.value
                        )
                      }
                      minLength={6}
                      maxLength={12}
                      placeholder={
                        user.txtOriginal_UserID ? "••••••" : ""
                      }
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      className={inputClass}
                    />
                  </td>

                  {/* CONFIRM PASSWORD */}

                  <td
                    className="
                      border-b
                      border-r
                      border-[#b7e8cf]
                      px-2
                    "
                  >
                    <input
                      id={`txtConfirmPwd-${index}`}
                      type="password"
                      value={user.txtConfirmPwd}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "txtConfirmPwd",
                          e.target.value
                        )
                      }
                      minLength={6}
                      maxLength={12}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      placeholder={
                        user.txtOriginal_UserID ? "••••••" : ""
                      }
                      className={inputClass}
                    />
                  </td>

                  {/* USER TYPE */}

                  <td
                    className="
                      border-b
                      border-r
                      border-[#b7e8cf]
                      p-2
                    "
                  >
                    <Select
                      inputId={`lkpUserType-${index}`}
                      options={userTypeOptions}
                      value={
                        userTypeOptions.find(
                          (option) =>
                            option.value === user.lkpUserType
                        ) ?? null
                      }
                      onChange={(option) =>
                        handleUserTypeChange(index, option)
                      }
                      isClearable={false}
                      isSearchable={false}
                      placeholder=""
                      styles={selectStyles}
                    />
                  </td>

                  {/* USER STATUS */}

                  <td
                    className="
                      border-b
                      border-[#b7e8cf]
                      p-2
                    "
                  >
                    <Select
                      inputId={`lkpUserStatus-${index}`}
                      options={userStatusOptions}
                      value={
                        userStatusOptions.find(
                          (option) =>
                            option.value === user.lkpUserStatus
                        ) ?? null
                      }
                      onChange={(option) =>
                        handleUserStatusChange(index, option)
                      }
                      isClearable={false}
                      isSearchable={false}
                      placeholder=""
                      styles={selectStyles}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============================================================
            ACTION BUTTONS
        ============================================================ */}

        <div className="mt-[14px] flex justify-center gap-3">
          {/* SAVE */}

          <button
            id="btnSave"
            type="button"
            onClick={handleSave}
            disabled={!perms.save}
            className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span className="underline underline-offset-2">
              S
            </span>
            ave
          </button>

          {/* CLEAR */}

          <button
            id="btnClear"
            type="button"
            onClick={handleClear}
            className={buttonClass}
          >
            <span className="underline underline-offset-2">
              C
            </span>
            lear
          </button>
        </div>

        </div>
      </div>

      {confirmDialog}
    </div>
  );
};

export default UserLogin;