import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../../hooks/useButtonPermissions";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useGridCellFocus, selectOnFocus } from "../../../../hooks/useGridCellFocus";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";

// dbo.tblmenu fmenuid of the Stock Document Re-Post page
const MENU_ID = "020106";

// the title of the screen: the heading, and the name in its messages (as the other screens)
const SCREEN_TITLE = "Stock Document Re-Post";

const api = import.meta.env.VITE_API_URL;

const StockDocumentRePost: React.FC = () => {
  const perms = useButtonPermissions(MENU_ID);
  const enterAsTab = useEnterAsTab();
  const { cellFocusClass } = useGridCellFocus();

  // the boxes (names = the element ids and the server's keys)
  const [txtFromTxnNo, setTxtFromTxnNo] = useState("");
  const [txtToTxnNo, setTxtToTxnNo] = useState("");
  const [posting, setPosting] = useState(false);

  // the cursor starts on the From Txn. No. box
  useInitialFocus(true, "txtFromTxnNo");

  // ============================================================
  // POST - the stock is built again from the posted documents between the two Txn. Nos.
  // ============================================================

  const handlePost = async () => {
    if (posting) return;

    if (!perms.post) {
      toast.error("You do not have permission to Post.");
      return;
    }

    const warn = (message: string, id: string) => {
      toast.warning(message);
      document.getElementById(id)?.focus();
    };

    const from = txtFromTxnNo.trim();
    const to = txtToTxnNo.trim();

    if (!from) return warn("Please enter 'From Txn. No.'", "txtFromTxnNo");
    if (!to) return warn("Please enter 'To Txn. No.'", "txtToTxnNo");

    setPosting(true);

    try {
      const response = await fetch(`${api}/StockDocumentRePost/repost`, {
        method: "POST",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txtFromTxnNo: from, txtToTxnNo: to }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || `${SCREEN_TITLE} could not be done`);
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      toast.success(<div style={{ whiteSpace: "pre-line" }}>{result.message}</div>);
    } catch {
      toast.error(`Cannot connect to ${SCREEN_TITLE} API.`);
    } finally {
      setPosting(false);
    }
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setTxtFromTxnNo("");
    setTxtToTxnNo("");
    document.getElementById("txtFromTxnNo")?.focus();
  };

  // Alt+P -> Post, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({ p: () => void handlePost(), c: handleClear });

  return (
    <div
      onKeyDown={enterAsTab}
      className="
        flex
        min-h-full
        w-full
        items-center
        justify-center
        bg-white
        pt-0
      "
    >
      {/* ======================================================
          MAIN CONTAINER
      ====================================================== */}

      <div
        className="
          w-[360px]
          border
          border-[#707070]
          bg-white
        "
      >
        {/* ====================================================
            TITLE
        ==================================================== */}

        <header
          className="
            flex
            h-[36px]
            items-center
            justify-start
            bg-[#9fdfbc]
            pl-[12px]
            text-[18px]
            font-semibold
            text-slate-700
          "
        >
          {SCREEN_TITLE}
        </header>

        {/* ====================================================
            FORM
        ==================================================== */}

        <div
          className="
            px-[7px]
            pt-[12px]
            pb-[10px]
          "
        >
          {/* ==================================================
              FROM TXN NO.
          ================================================== */}

          <div
            className="
              flex
              h-[27px]
              items-center
              mb-[10px]
            "
          >
            <label
              htmlFor="txtFromTxnNo"
              className="
                w-[104px]
                shrink-0
                pr-[7px]
                text-right
                text-[14px]
                whitespace-nowrap
              "
            >
              From Txn No. :
            </label>

            <div className={`relative w-[214px] ${cellFocusClass}`}>
              <input
                id="txtFromTxnNo"
                name="txtFromTxnNo"
                type="text"
                value={txtFromTxnNo}
                onFocus={selectOnFocus}
                onChange={(event) => setTxtFromTxnNo(event.target.value)}
                className="
                  h-[27px]
                  w-full
                  rounded-[3px]
                  border
                  border-[#aeb8c2]
                  bg-white
                  px-[8px]
                  text-[13px]
                  text-[#344054]
                  outline-none
                  focus:border-[#8fa3b5]
                  focus:ring-0
                "
              />
            </div>
          </div>

          {/* ==================================================
              TO TXN NO.
          ================================================== */}

          <div
            className="
              flex
              h-[27px]
              items-center
            "
          >
            <label
              htmlFor="txtToTxnNo"
              className="
                 w-[104px]
                shrink-0
                pr-[7px]
                text-right
                text-[14px]
                whitespace-nowrap
              "
            >
              To Txn No. :
            </label>

            <div className={`relative w-[214px] ${cellFocusClass}`}>
              <input
                id="txtToTxnNo"
                name="txtToTxnNo"
                type="text"
                value={txtToTxnNo}
                onFocus={selectOnFocus}
                onChange={(event) => setTxtToTxnNo(event.target.value)}
                className="
                  h-[27px]
                  w-full
                  rounded-[3px]
                  border
                  border-[#aeb8c2]
                  bg-white
                  px-[8px]
                  text-[13px]
                  text-[#344054]
                  outline-none
                  focus:border-[#8fa3b5]
                  focus:ring-0
                "
              />
            </div>
          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div
            className="
              mt-[9px]
              flex
              justify-center
              gap-[13px]
            "
          >
            {/* POST */}

            <button
              id="btnPost"
              type="button"
              onClick={() => void handlePost()}
              disabled={!perms.post || posting}
              className="
                btn-style
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <u>P</u>ost
            </button>

            {/* CLEAR */}

            <button
              id="btnClear"
              type="button"
              onClick={handleClear}
              className="
               btn-style
              "
            >
              <u>C</u>lear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDocumentRePost;
