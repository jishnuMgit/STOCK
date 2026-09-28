import React, { useState } from "react";
import Select, { type SingleValue } from "react-select";

// ============================================================
// TYPES
// ============================================================

interface UserRow {
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
  txtUserID: "",
  txtUserName: "",
  txtPwd: "",
  txtConfirmPwd: "",
  lkpUserType: "",
  lkpUserStatus: "",
});

// ============================================================
// USER TYPE OPTIONS
// ============================================================

const userTypeOptions: SelectOption[] = [
  {
    value: "ADMIN",
    label: "ADMIN",
  },
  {
    value: "USER",
    label: "USER",
  },
  {
    value: "SUPERVISOR",
    label: "SUPERVISOR",
  },
];

// ============================================================
// USER STATUS OPTIONS
// ============================================================

const userStatusOptions: SelectOption[] = [
  {
    value: "Active",
    label: "Active",
  },
  {
    value: "Inactive",
    label: "Inactive",
  },
];

// ============================================================
// DUMMY DATA
// ============================================================

const initialUsers: UserRow[] = [
  {
    txtUserID: "1",
    txtUserName: "1",
    txtPwd: "123",
    txtConfirmPwd: "123",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "123",
    txtUserName: "123",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "ABDULAZIZ",
    txtUserName: "ABDULAZIZ",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "ADMIN",
    txtUserName: "ACCOUNTS SUPERVISOR",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AFZAL",
    txtUserName: "ACCOUNTS",
    txtPwd: "123",
    txtConfirmPwd: "123",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AMAAN",
    txtUserName: "ADMIN",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AFZAL",
    txtUserName: "AFZAL",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AMAAN",
    txtUserName: "AMAAN",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "CREDIT",
    txtUserName: "CREDIT CONTROL",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "RANDA",
    txtUserName: "ACCOUNTANT",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    lkpUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
];

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
  const [users, setUsers] = useState<UserRow[]>(initialUsers);

  // ============================================================
  // TOTAL VISIBLE ROWS
  // ============================================================

  const totalRows = 18;

  // ============================================================
  // GET DISPLAY ROWS
  // ============================================================

  const displayUsers = Array.from(
    { length: totalRows },
    (_, index) => users[index] ?? createEmptyUser()
  );

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
  // SAVE
  // ============================================================

  const handleSave = () => {
    const filledUsers = users.filter(
      (user) =>
        user.txtUserID.trim() !== "" ||
        user.txtUserName.trim() !== "" ||
        user.txtPwd.trim() !== "" ||
        user.txtConfirmPwd.trim() !== "" ||
        user.lkpUserType.trim() !== "" ||
        user.lkpUserStatus.trim() !== ""
    );

    console.log("Save Users:", filledUsers);
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setUsers([]);
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
                    w-[38%]
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
                    w-[12%]
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
                      className={inputClass}
                    />
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
                      className={inputClass}
                    />
                  </td>

                  {/* USER TYPE */}

                  <td
                    className="
                      border-b
                      border-r
                      border-[#b7e8cf]
                      p-0
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
                      p-0
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
    </div>
  );
};

export default UserLogin;