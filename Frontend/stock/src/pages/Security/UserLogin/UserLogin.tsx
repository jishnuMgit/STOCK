import React, { useEffect, useRef, useState } from "react";
import Select, { type SingleValue } from "react-select";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
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

const buttonClass = `
  min-w-[120px]
  h-[40px]
  rounded-[4px]
  border-l
  border-r
  border-b
  border-[#9db8d4]
  border-t-0
  bg-gradient-to-b
  from-[#ffffff]
  to-[#e7eef5]
  px-4
  text-[18px]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
  transition-colors
  duration-100
  text-transparent
  bg-clip-text
  bg-gradient-to-r
  from-green-800
  to-green-500
  hover:border-l-[#7f9fbd]
  hover:border-r-[#7f9fbd]
  hover:border-b-[#7f9fbd]
  hover:bg-gradient-to-b
  hover:from-[#ffffff]
  hover:to-[#dce8f1]
  focus:border-l-[#20884e]
  focus:border-r-[#20884e]
  focus:border-b-[#20884e]
  focus:border-t-0
  focus:bg-gradient-to-b
  focus:from-[#ffffff]
  focus:to-[#dcefe5]
  focus:outline-none
  focus:ring-0
  hover:text-green-800
`;

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

const UserLogin: React.FC = () => {
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

      const toOptions = (rows: { fpid: string; fpname: string }[]) =>
        rows.map((row) => ({ value: row.fpid, label: row.fpname }));

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
          setUserTypeOptions(toOptions(typeResult.data));
        }

        if (statusResult.success) {
          setUserStatusOptions(toOptions(statusResult.data));
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ PstrCoID, PstrUserID, rows }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "User logins could not be saved.");
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

    // never saved - just drop the row
    if (!row.txtOriginal_UserID) {
      setUsers((previous) => previous.filter((_, index) => index !== rowIndex));
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
      className="
        min-h-fit
        mx-auto
        flex
        w-[1000px]
        mt-5
        items-center
        justify-center
        bg-white
        px-0
        pt-0
      "
    >
      {/* ============================================================
          MAIN CONTAINER
      ============================================================ */}

      <div
        className="
          w-full
          border
          border-slate-400
          bg-white
        "
      >
        {/* ============================================================
            TITLE
        ============================================================ */}

        <div
          className="
            flex
            h-7.5
            w-full
            items-center
            justify-start
            bg-[#a3dfc0]
          "
        >
          <h1
            className="
              ml-[15px]
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
            User Login
          </h1>
        </div>

        {/* ============================================================
            TABLE
        ============================================================ */}

        <div
          className="
            mx-4
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
                  h-6
                  bg-[#f0faf5]
                "
              >
                <th
                  className="
                    w-[23%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[12px]
                    font-normal
                    whitespace-nowrap
                    text-slate-800
                  "
                >
                  User ID
                </th>

                <th
                  className="
                    w-[34%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[12px]
                    font-normal
                    whitespace-nowrap
                    text-slate-800
                  "
                >
                  User Name
                </th>

                <th
                  className="
                    w-[15%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[12px]
                    font-normal
                    text-slate-800
                  "
                >
                  Password
                </th>

                <th
                  className="
                    w-[15%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[12px]
                    font-normal
                    whitespace-nowrap
                    text-slate-800
                  "
                >
                  Confirm Password
                </th>

                <th
                  className="
                    w-[16%]
                    border-b
                    border-r
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[12px]
                    font-normal
                    whitespace-nowrap
                    text-slate-800
                  "
                >
                  User Type
                </th>

                <th
                  className="
                    w-[12%]
                    border-b
                    border-[#b7e8cf]
                    px-2
                    text-left
                    text-[12px]
                    font-normal
                    whitespace-nowrap
                    text-slate-800
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
                        className={inputClass}
                      />

                      {user.txtUserID.trim() !== "" && (
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
                      p-1
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
                      p-1
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

        <div
          className="
            mt-5
            flex
            items-center
            justify-center
            gap-3
            pb-3
            pt-0
          "
        >
          {/* SAVE */}

          <button
            id="btnSave"
            type="button"
            onClick={handleSave}
            className={buttonClass}
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

      {confirmDialog}
    </div>
  );
};

export default UserLogin;