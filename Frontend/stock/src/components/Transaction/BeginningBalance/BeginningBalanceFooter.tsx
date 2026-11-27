import React from "react";

import TransactionActions from "../../common/TransactionActions";

// ============================================================
// INPUT STYLE
// ============================================================

// the Receipt screen's Total box: 30 px, grey border, 14 px dark text, read only
const inputClass =
  "h-7.5 rounded border border-gray-300 bg-white px-2 text-[14px] text-[#344054] outline-none";

// ============================================================
// PROPS: the totals and the buttons belong to the page
// ============================================================

type Props = {
  txtDebitTotal: string;
  txtCreditTotal: string;
  txtDifference: string;
  // the total debit and the total credit differ
  chkDifferent: boolean;
  // "Created By : X date" / "Last Modified By : Y date", as the old form showed
  txtUserInfo: string;
  // the branch has a balance: the button says Modify, not Save
  chkSaved: boolean;
  chkPosted: boolean;
  saving: boolean;
  canSaveOrModify: boolean;
  canDelete: boolean;
  canPost: boolean;
  canPrint: boolean;
  onSave: () => void;
  onDelete: () => void;
  onPost: () => void;
  onPrint: () => void;
  onClear: () => void;
};

// ============================================================
// FOOTER
// ============================================================

const BeginningBalanceFooter: React.FC<Props> = ({
  txtDebitTotal,
  txtCreditTotal,
  txtDifference,
  chkDifferent,
  txtUserInfo,
  chkSaved,
  chkPosted,
  saving,
  canSaveOrModify,
  canDelete,
  canPost,
  canPrint,
  onSave,
  onDelete,
  onPost,
  onPrint,
  onClear,
}) => {
  const actionWord = chkSaved ? "Modify" : "Save";

  return (
    <footer
      id="beginning-balance-footer"
      className="
        relative
        h-[172px]
        w-full
        shrink-0
        overflow-hidden
        bg-white
      "
    >

      {/* ======================================================
          TOTALS
      ====================================================== */}

      <div
        className="
          absolute
          right-[17px]
          top-[10px]
          flex

          h-[25px]
          items-center
        "
      >
        {/* Debit Total */}

        <input
          id="txtDebitTotal"
          name="txtDebitTotal"
          type="text"
          value={txtDebitTotal}
          readOnly
          tabIndex={-1}
          className={`${inputClass} w-[124px] text-right`}
        />

        {/* Credit Total */}

        <input
          id="txtCreditTotal"
          name="txtCreditTotal"
          type="text"
          value={txtCreditTotal}
          readOnly
          tabIndex={-1}
          className={`${inputClass} ml-[6px] w-[154px] text-right`}
        />
      </div>

      {/* ======================================================
          DIFFERENCE
      ====================================================== */}

      <div
        className="
          absolute
          right-[37px]
          top-[48px]
          flex
          h-[25px]
          items-center
        "
      >
        <label
          htmlFor="txtDifference"
          className="
            mr-[8px]
            whitespace-nowrap
            text-[13px]
            text-[#505050]
          "
        >
          Diff. : (Dr.- Cr.) :
        </label>

        <input
          id="txtDifference"
          name="txtDifference"
          type="text"
          value={txtDifference}
          readOnly
          tabIndex={-1}
          className={`
            h-7.5
            w-[154px]
            rounded
            border
            border-gray-300
            bg-white
            px-2
            text-right
            text-[14px]
            outline-none
            ${chkDifferent ? "text-red-600" : "text-[#202020]"}
          `}
        />
      </div>

      {/* ======================================================
          SAVED BY / LAST MODIFIED BY
      ====================================================== */}

      {txtUserInfo !== "" && (
        <table className="absolute right-[82px] top-[84px] border-collapse text-left text-[12px] text-gray-500">
          <tbody>
            {/* one row per line ("Created By : ..." / "Last Modified By : ..."), in
                three columns - label, colon, text - so the colons line up */}
            {txtUserInfo.split("\n").map((line) => {
              const [label, ...rest] = line.split(" : ");

              return (
                <tr key={label}>
                  <td className="whitespace-nowrap pr-[4px]">{label}</td>
                  <td className="pr-[4px]">:</td>
                  <td className="whitespace-nowrap">{rest.join(" : ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ======================================================
          ACTION BUTTONS
      ====================================================== */}

      <TransactionActions
        className="absolute bottom-[8px] left-1/2 flex -translate-x-1/2 gap-[15px]"
        actions={[
          {
            id: chkSaved ? "btnModify" : "btnSave",
            label: actionWord,
            underlineIndex: 0,
            onClick: onSave,
            disabled: !canSaveOrModify || saving || chkPosted,
          },
          {
            id: "btnDelete",
            label: "Delete",
            underlineIndex: 0,
            onClick: onDelete,
            disabled: !chkSaved || chkPosted || !canDelete || saving,
          },
          // Print works at any time: it needs a branch and a date, not a saved balance
          {
            id: "btnPrint",
            label: "Print",
            underlineIndex: 0,
            onClick: onPrint,
            disabled: !canPrint || saving,
          },
          // Post: the balance is final after it, the page is locked
          {
            id: "btnPost",
            label: "Post",
            underlineIndex: 1,
            onClick: onPost,
            disabled: !chkSaved || chkPosted || !canPost || saving,
          },
          {
            id: "btnClear",
            label: "Clear",
            onClick: onClear,
            disabled: saving,
          },
        ]}
      />
    </footer>
  );
};

export default BeginningBalanceFooter;
