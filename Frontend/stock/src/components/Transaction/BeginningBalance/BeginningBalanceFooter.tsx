import React from "react";

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "input-style ";

// ============================================================
// PROPS: the totals and the buttons belong to the page
// ============================================================

type Props = {
  txtDebitTotal: string;
  txtCreditTotal: string;
  txtDifference: string;
  // the total debit and the total credit differ
  chkDifferent: boolean;
  // "Saved By : X date" / "Last Modified By : Y date", as the old form showed
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
            h-[30px]
            w-[154px]
            border
            border-[#cbd5e1]
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
            {/* one row per line ("Saved By : ..." / "Last Modified By : ..."), in
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

      <div
        className="
          absolute
          bottom-[8px]
          left-1/2
          flex
          -translate-x-1/2
          gap-[15px]
        "
      >

        {/* SAVE / MODIFY (one button: it says Modify once the branch has a balance) */}

        <button
          id={chkSaved ? "btnModify" : "btnSave"}
          name={chkSaved ? "btnModify" : "btnSave"}
          type="button"
          onClick={onSave}
          disabled={!canSaveOrModify || saving || chkPosted}
          title={chkSaved ? "Alt+M" : "Alt+S"}
          className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
        >
          <u>{actionWord.charAt(0)}</u>
          {actionWord.slice(1)}
        </button>

        {/* DELETE */}

        <button
          id="btnDelete"
          name="btnDelete"
          type="button"
          onClick={onDelete}
          disabled={!chkSaved || chkPosted || !canDelete || saving}
          title="Alt+D"
          className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
        >
          <u>D</u>elete
        </button>

        {/* PRINT (at any time: it needs a branch and a date, not a saved balance) */}

        <button
          id="btnPrint"
          name="btnPrint"
          type="button"
          onClick={onPrint}
          disabled={!canPrint || saving}
          title="Alt+P"
          className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
        >
          <u>P</u>rint
        </button>

        {/* POST (the balance is final after it: the page is locked) */}

        <button
          id="btnPost"
          name="btnPost"
          type="button"
          onClick={onPost}
          disabled={!chkSaved || chkPosted || !canPost || saving}
          title="Alt+T"
          className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
        >
          Pos<u>t</u>
        </button>

        {/* CLEAR */}

        <button
          id="btnClear"
          name="btnClear"
          type="button"
          onClick={onClear}
          disabled={saving}
          title="Alt+C"
          className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
        >
          <u>C</u>lear
        </button>
      </div>
    </footer>
  );
};

export default BeginningBalanceFooter;
