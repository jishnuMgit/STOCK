import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../../hooks/useButtonPermissions";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useGridCellFocus, selectOnFocus } from "../../../../hooks/useGridCellFocus";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import Header from "../../../../components/common/Header";

// dbo.tblmenu fmenuid of the Stock Document Re-Post page
const MENU_ID = "020106";

// the title of the screen: the heading, and the name in its messages (as the other screens)
const SCREEN_TITLE = "Stock Document Re-Post";

const api = import.meta.env.VITE_API_URL;

// 7.4 sec / 2 min 5.3 sec / 1 hr 2 min 5 sec
const formatElapsed = (ms: number | null): string => {
  if (ms === null) return "-";

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)} sec`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return hours > 0
    ? `${hours} hr ${minutes} min ${seconds} sec`
    : `${minutes} min ${seconds} sec`;
};

const StockDocumentRePost: React.FC = () => {
  const perms = useButtonPermissions(MENU_ID);
  const enterAsTab = useEnterAsTab();
  const { cellFocusClass } = useGridCellFocus();

  // the boxes (names = the element ids and the server's keys)
  const [txtFromTxnNo, setTxtFromTxnNo] = useState("");
  const [txtToTxnNo, setTxtToTxnNo] = useState("");
  const [posting, setPosting] = useState(false);
  const [totalPostedCount, setTotalPostedCount] = useState<number | null>(null);
  const [defaultRange, setDefaultRange] = useState({ from: "", to: "" });
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [currentDoc, setCurrentDoc] = useState("");
  const startRef = useRef(0);
  const timeFromServerRef = useRef<number | null>(null);

  // the posting range comes from dbo.sp_getpostingrange (min, max and count of the posted documents)
  const fetchRange = useCallback(async () => {
    try {
      // the login year (the same as the other screens)
      const PstrYear = localStorage.getItem("PstrYear") ?? "";

      if (!/^\d{4}$/.test(PstrYear)) {
        toast.error("getRange: no PstrYear in localStorage");
        return null;
      }

      const response = await fetch(
        `${api}/StockDocumentRePost/getRange?PstrYear=${encodeURIComponent(PstrYear)}`,
        {
          credentials: "include",
        }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || `${SCREEN_TITLE} range could not be loaded`);
        return null;
      }

      return {
        from: result.minPostingNo ?? "",
        to: result.maxPostingNo ?? "",
        count: Number(result.totalPostedCount ?? 0),
      };
    } catch {
      toast.error(`Cannot connect to ${SCREEN_TITLE} API.`);
      return null;
    }
  }, []);

  const loadRange = useCallback(async () => {
    const range = await fetchRange();
    if (!range) return;

    setDefaultRange({ from: range.from, to: range.to });
    setTxtFromTxnNo(range.from);
    setTxtToTxnNo(range.to);
    setTotalPostedCount(range.count);
  }, [fetchRange]);

  // on page load
  useEffect(() => {
    let active = true;

    void fetchRange().then((range) => {
      if (!range || !active) return;

      setDefaultRange({ from: range.from, to: range.to });
      setTxtFromTxnNo(range.from);
      setTxtToTxnNo(range.to);
      setTotalPostedCount(range.count);
    });

    return () => {
      active = false;
    };
  }, [fetchRange]);

  // while posting: the running time, and (every half second) the document being posted now
  useEffect(() => {
    if (!posting) return;

    const clock = window.setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 200);

    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`${api}/StockDocumentRePost/getProgress`, {
          credentials: "include",
        });
        const result = await response.json();
        if (result.success) setCurrentDoc(result.current ?? "");
      } catch {
        // a missed poll is fine: the next one follows
      }
    }, 500);

    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
    };
  }, [posting]);

  // the cursor starts on the From Txn. No. box
  useInitialFocus(true, "btnRePost");

  // ============================================================
  // POST - the stock is built again from the posted documents between the two Txn. Nos.
  // ============================================================

  // the two Posting No. boxes take no focus: the cursor goes to the Post button
  const focusRePost = () => {
    window.setTimeout(() => document.getElementById("btnRePost")?.focus(), 0);
  };

  const handleRePost = async () => {
    if (posting) return;

    if (!perms.post) {
      toast.error("You do not have permission to Post.");
      return;
    }

    const warn = (message: string) => {
      toast.warning(message);
      focusRePost();
    };

    const from = txtFromTxnNo.trim();
    const to = txtToTxnNo.trim();

    if (!from) return warn("Please enter 'From Txn. No.'");
    if (!to) return warn("Please enter 'To Txn. No.'");

    // the login year (the same as the other screens)
    const PstrYear = localStorage.getItem("PstrYear") ?? "";

    if (!/^\d{4}$/.test(PstrYear)) {
      toast.error("rePost: no PstrYear in localStorage");
      return;
    }

    startRef.current = Date.now();
    timeFromServerRef.current = null;
    setElapsedMs(0);
    setCurrentDoc("");
    setPosting(true);

    try {
      const response = await fetch(`${api}/StockDocumentRePost/repost`, {
        method: "POST",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PstrYear, txtFromTxnNo: from, txtToTxnNo: to }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || `${SCREEN_TITLE} could not be done`);
        focusRePost();
        return;
      }

      // the time the database took (the procedure's own clock) replaces the browser's running time
      if (typeof result.txtTimeTakenSec === "number") {
        timeFromServerRef.current = result.txtTimeTakenSec * 1000;
      }

      toast.success(<div style={{ whiteSpace: "pre-line" }}>{result.message}</div>);
      void loadRange();
    } catch {
      toast.error(`Cannot connect to ${SCREEN_TITLE} API.`);
    } finally {
      setElapsedMs(timeFromServerRef.current ?? Date.now() - startRef.current);
      setCurrentDoc("");
      setPosting(false);
    }
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setTxtFromTxnNo(defaultRange.from);
    setTxtToTxnNo(defaultRange.to);
    focusRePost();
  };

  // Alt+P -> Post, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({ p: () => void handleRePost(), c: handleClear });

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
          w-[400px]
          border
          border-[#707070]
          bg-white
        "
      >
        {/* ====================================================
            TITLE
        ==================================================== */}

        <Header Name="Stock Document Re-Post" />

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
                w-[150px]
                shrink-0
                pr-[7px]
                text-right
                text-[14px]
                whitespace-nowrap
              "
            >
              From Posting No. :
            </label>

            <div className={`relative w-[140px] ${cellFocusClass}`}>
              <input
                id="txtFromTxnNo"
                name="txtFromTxnNo"
                type="text"
                value={txtFromTxnNo}
                onFocus={selectOnFocus}
                readOnly
                tabIndex={-1}
                className="
                  pointer-events-none
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
                w-[150px]
                shrink-0
                pr-[7px]
                text-right
                text-[14px]
                whitespace-nowrap
              "
            >
              To Posting No. :
            </label>

            <div className={`relative w-[140px] ${cellFocusClass}`}>
              <input
                id="txtToTxnNo"
                name="txtToTxnNo"
                type="text"
                value={txtToTxnNo}
                onFocus={selectOnFocus}
                readOnly
                tabIndex={-1}
                className="
                  pointer-events-none
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
              TOTAL POSTED COUNT
          ================================================== */}

          <div className="mt-[10px] flex h-[27px] items-center">
            <label
              htmlFor="lblTotalPostedCount"
              className="w-[150px] shrink-0 pr-[7px] text-right text-[14px] whitespace-nowrap"
            >
              Total Documents :
            </label>
            <span
              id="lblTotalPostedCount"
              className="text-[14px] font-semibold text-slate-700"
            >
              {totalPostedCount === null ? "..." : totalPostedCount}
            </span>
          </div>

          {/* ==================================================
              POSTING DOCUMENT (the document being posted now)
          ================================================== */}

          <div className="mt-[6px] flex h-[27px] items-center">
            <label
              htmlFor="lblPostingDocument"
              className="w-[150px] shrink-0 pr-[7px] text-right text-[14px] whitespace-nowrap"
            >
              Posting Document :
            </label>
            <span
              id="lblPostingDocument"
              className="text-[14px] font-semibold text-slate-700"
            >
              {posting ? currentDoc || "..." : "-"}
            </span>
          </div>

          {/* ==================================================
              TOTAL TIME TAKEN
          ================================================== */}

          <div className="mt-[6px] flex h-[27px] items-center">
            <label
              htmlFor="lblTimeTaken"
              className="w-[150px] shrink-0 pr-[7px] text-right text-[14px] whitespace-nowrap"
            >
              Total Time Taken :
            </label>
            <span
              id="lblTimeTaken"
              className="text-[14px] font-semibold text-slate-700"
            >
              {formatElapsed(elapsedMs)}
            </span>
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
              id="btnRePost"
              type="button"
              onClick={() => void handleRePost()}
              disabled={!perms.post || posting}
              className="
                btn-style
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <u>R</u>epost
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
