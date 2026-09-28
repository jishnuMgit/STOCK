import React, { useState } from "react";

// ============================================================
// TYPES
// ============================================================

interface UserRow {
  txtUserID: string;
  txtUserName: string;
  txtPwd: string;
  txtConfirmPwd: string;
  txtUserType: string;
  lkpUserStatus: string;
}

// ============================================================
// EMPTY USER
// ============================================================

const createEmptyUser = (): UserRow => ({
  txtUserID: "",
  txtUserName: "",
  txtPwd: "",
  txtConfirmPwd: "",
  txtUserType: "",
  lkpUserStatus: "",
});

// ============================================================
// DUMMY DATA
// ============================================================

const initialUsers: UserRow[] = [
  {
    txtUserID: "1",
    txtUserName: "1",
    txtPwd: "123",
    txtConfirmPwd: "123",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "123",
    txtUserName: "123",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "ABDULAZIZ",
    txtUserName: "ABDULAZIZ",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "ADMIN",
    txtUserName: "ACCOUNTS SUPERVISOR",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AFZAL",
    txtUserName: "ACCOUNTS",
    txtPwd: "123",
    txtConfirmPwd: "123",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AMAAN",
    txtUserName: "ADMIN",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AFZAL",
    txtUserName: "AFZAL",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "AMAAN",
    txtUserName: "AMAAN",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "CREDIT",
    txtUserName: "CREDIT CONTROL",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
    lkpUserStatus: "Active",
  },
  {
    txtUserID: "RANDA",
    txtUserName: "ACCOUNTANT",
    txtPwd: "123456",
    txtConfirmPwd: "123456",
    txtUserType: "ADMIN",
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
`;

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
  //
  // Existing users + blank editable rows
  // ============================================================

  const displayUsers = Array.from(
    { length: totalRows },
    (_, index) => users[index] ?? createEmptyUser()
  );

  // ============================================================
  // UPDATE CELL
  //
  // This also creates a new row when typing into
  // an empty row.
  // ============================================================

  const handleChange = (
    rowIndex: number,
    field: keyof UserRow,
    value: string
  ) => {
    setUsers((previous) => {
      const updatedUsers = [...previous];

      // Create missing rows until the selected row exists
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
  // SAVE
  // ============================================================

  const handleSave = () => {
    // Only send rows that contain data
    const filledUsers = users.filter(
      (user) =>
        user.txtUserID.trim() !== "" ||
        user.txtUserName.trim() !== "" ||
        user.txtPwd.trim() !== "" ||
        user.txtConfirmPwd.trim() !== "" ||
        user.txtUserType.trim() !== "" ||
        user.lkpUserStatus.trim() !== ""
    );

    console.log("Save Users:", filledUsers);
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = () => {
    console.log("Delete User");
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
                {/* USER ID */}

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

                {/* USER NAME */}

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

                {/* PASSWORD */}

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

                {/* CONFIRM PASSWORD */}

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

                {/* USER TYPE */}

                <th
                  className="
                    w-[9%]
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

                {/* USER STATUS */}

                <th
                  className="
                    w-[10%]
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
                  className="
                    h-[25px]
                  "
                >
                  {/* ==================================================
                      USER ID
                  ================================================== */}

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
                      className={inputClass}
                    />
                  </td>

                  {/* ==================================================
                      USER NAME
                  ================================================== */}

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
                      className={inputClass}
                    />
                  </td>

                  {/* ==================================================
                      PASSWORD
                  ================================================== */}

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
                      className={inputClass}
                    />
                  </td>

                  {/* ==================================================
                      CONFIRM PASSWORD
                  ================================================== */}

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
                      className={inputClass}
                    />
                  </td>

                  {/* ==================================================
                      USER TYPE
                  ================================================== */}

                  <td
                    className="
                      border-b
                      border-r
                      border-[#b7e8cf]
                      px-2
                    "
                  >
                    <input
                      id={`txtUserType-${index}`}
                      type="text"
                      value={user.txtUserType}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "txtUserType",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </td>

                  {/* ==================================================
                      USER STATUS
                  ================================================== */}

                  <td
                    className="
                      border-b
                      border-[#b7e8cf]
                      px-2
                    "
                  >
                    <input
                      id={`lkpUserStatus-${index}`}
                      type="text"
                      value={user.lkpUserStatus}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "lkpUserStatus",
                          e.target.value
                        )
                      }
                      className={inputClass}
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

          {/* DELETE */}

          <button
            id="btnDelete"
            type="button"
            onClick={handleDelete}
            className={buttonClass}
          >
            <span className="underline underline-offset-2">
              D
            </span>
            elete
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