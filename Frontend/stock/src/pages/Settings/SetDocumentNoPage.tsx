import React, { useEffect, useRef, useState } from "react";
import Header from "../../components/common/Header";
import CommonTableSelect, {
  CustomTableSelect,
  type TableSelectOption,
} from "../../components/common/CommonTableSelect";
import { filterLabelOrValue } from "../../components/BranchSelect/branchSelectParts";
import { X } from "lucide-react";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useConfirmModal } from "../../hooks/useConfirmModal";
import { deleteSuccessMessage } from "../../hooks/useDeleteToast";
import { useGridCellFocus } from "../../hooks/useGridCellFocus";
import { useAdvanceAfterSelect } from "../../hooks/useAdvanceAfterSelect";
import { useCtrlShortcuts } from "../../hooks/useCtrlShortcuts";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import { tryGetServerDate } from "../../utils/serverDate";
import { useMessageModal } from "../../hooks/useMessageModal";
import TransactionActions from "../../components/common/TransactionActions";


// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface DocumentRow {
  id: number;
  lkpDocument: string;

  lkpMode: string;
  txtDocPrefix: string;
  txtStartSeqNo: string;

  chkStrictSerial: boolean;

  lkpResetNo: string;
  chkPrintAfterSave: boolean;
  txtPositionNo: number;
}

// ============================================================
// OPTIONS
// ============================================================

const modeOptions: SelectOption[] = [
  { value: "Auto", label: "Auto" },
  { value: "Manual", label: "Manual" },
];

const resetOptions: SelectOption[] = [
  { value: "Never", label: "Never" },
  { value: "Yearly", label: "Yearly" },
  { value: "Monthly", label: "Monthly" },
];

// Branch list: "Branch | ID", as on the other screens
const BRANCH_COLUMNS = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];

// ============================================================
// COMPONENT
// ============================================================

// dbo.tblmenu fmenuid for the Set Document No. page.
const MENU_ID = "9102";

const SetDocumentNo: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  // the common themed question window and the standard delete messages
  const { confirm, dialog } = useConfirmModal();
  // the messages (warnings, errors, saved ...) are the common message window, as on the Payment screen - not a toast
  const { notify, dialog: messageDialog } = useMessageModal("Set Document No.");
  // the cell the cursor is in is outlined (a typed-in box has its text selected)
  const { cellFocusClass, selectOnFocus } = useGridCellFocus();
  // after a dropdown pick (or Enter on a closed one) the cursor goes on in the row
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();
  const perms = useButtonPermissions(MENU_ID);

  // ==========================================================
  // HEADER STATES
  // ==========================================================

  const [lkpYear, setLkpYear] =
    useState<string>(
      () => localStorage.getItem("PstrYear") || ""
    );

  const [yearOptions, setYearOptions] = useState<SelectOption[]>([]);
  const [lkpBranch, setLkpBranch] = useState<string>("");
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [lkpModule, setLkpModule] = useState<string>("");

  // the user's default branch has been asked for (found or not) - the cursor can start
  const [branchDefaultLoaded, setBranchDefaultLoaded] = useState(false);
  const [moduleOptions, setModuleOptions] = useState<SelectOption[]>([]);

  /* =======================================================
     LOAD YEAR LIST (lkpYear dropdown)
  ======================================================= */

  useEffect(() => {
    const loadYearList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          notify.error("getYearList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getYearList?PstrCoID=${PstrCoID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getYearList failed:", result.message);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { lkpYear: number }) => ({
            value: String(row.lkpYear),
            label: String(row.lkpYear),
          }),
        );

        setYearOptions(options);
      } catch (error) {
        console.error("getYearList error:", error);
      }
    };

    loadYearList();
  }, []);

  /* =======================================================
     LOAD DEFAULT BRANCH (lkpBranch pre-select, live lookup
     via dbo.getuserdefbranch — not localStorage)
  ======================================================= */

  useEffect(() => {
    const loadDefaultBranch = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrUserID = localStorage.getItem("PstrUserID");

        if (!PstrCoID || !PstrUserID) {
          notify.error("getDefaultBranch: no PstrCoID/PstrUserID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getDefaultBranch?PstrCoID=${PstrCoID}&PstrUserID=${PstrUserID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getDefaultBranch failed:", result.message);
          notify.error(`getDefaultBranch failed: ${result.message}`);
          return;
        }

        if (result.data) {
          setLkpBranch(result.data);
        }
      } catch (error) {
        console.error("getDefaultBranch error:", error);
        notify.error(
          `getDefaultBranch error: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setBranchDefaultLoaded(true);
      }
    };

    loadDefaultBranch();
  }, []);

  /* =======================================================
     LOAD BRANCH LIST (lkpBranch dropdown)
  ======================================================= */

  useEffect(() => {
    const loadBranchList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrUserID = localStorage.getItem("PstrUserID");

        if (!PstrCoID || !PstrUserID) {
          notify.error("getBranchList: no PstrCoID/PstrUserID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getBranchList?PstrCoID=${PstrCoID}&PstrUserID=${PstrUserID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getBranchList failed:", result.message);
          notify.error(`getBranchList failed: ${result.message}`);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          }),
        );

        setBranchOptions(options);
      } catch (error) {
        console.error("getBranchList error:", error);
        notify.error(
          `getBranchList error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadBranchList();
  }, []);

  /* =======================================================
     LOAD MODULE LIST (lkpModule dropdown)
  ======================================================= */

  useEffect(() => {
    const loadModuleList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          notify.error("getModuleList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getModuleList?PstrCoID=${PstrCoID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getModuleList failed:", result.message);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { lkpModule: string; txtModuleName: string }) => ({
            value: row.lkpModule,
            label: row.txtModuleName,
          }),
        );

        setModuleOptions(options);

        // Auto-select the first module so the grid isn't empty on load
        if (options.length > 0) {
          setLkpModule((current) => current || options[0].value);
        }
      } catch (error) {
        console.error("getModuleList error:", error);
      }
    };

    loadModuleList();
  }, []);

  // ==========================================================
  // TABLE STATES
  // ==========================================================

  const [rows, setRows] = useState<DocumentRow[]>([]);

  // Does this Year + Branch + Module already have saved numbering?
  // false -> the button says Save, true -> Modify. Set by the grid load.
  const [hasSavedRows, setHasSavedRows] = useState(false);

  // bumped after a save so the grid loads again (the button flips to Modify)
  const [reloadKey, setReloadKey] = useState(0);
  const [documentOptions, setDocumentOptions] = useState<SelectOption[]>([]);

  // ==========================================================
  // WHERE THE CURSOR STARTS (once, on page load)
  // The first header box that is still empty (Year, Branch); when Year, Branch
  // and Module are all chosen, the Prefix of the first row that has no numbering
  // yet (the first row when every row has some).
  // ==========================================================

  const cursorStarted = useRef(false);

  useEffect(() => {
    if (cursorStarted.current || !branchDefaultLoaded) return;

    let targetId = "";

    if (!lkpYear) {
      targetId = "lkpYear";
    } else if (!lkpBranch) {
      targetId = "lkpBranch";
    } else if (rows.length > 0) {
      const target =
        rows.find((row) => !row.txtDocPrefix.trim() && !row.txtStartSeqNo.trim()) ??
        rows[0];

      targetId = `txtDocPrefix_${target.id}`;
    } else {
      return; // the grid is still loading
    }

    cursorStarted.current = true;

    window.setTimeout(() => document.getElementById(targetId)?.focus(), 0);
  }, [branchDefaultLoaded, lkpYear, lkpBranch, rows]);

  /* =======================================================
     LOAD DOCUMENT LIST (per Module) + existing saved rules
     (per Year/Branch/Module) — merged into the grid rows
  ======================================================= */

  useEffect(() => {
    if (!lkpModule) {
      setDocumentOptions([]);
      setRows([]);
      setHasSavedRows(false);
      return;
    }

    const loadDocumentGrid = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          notify.error("getDocumentList: no PstrCoID in localStorage");
          return;
        }

        const docListResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getDocumentList?PstrCoID=${PstrCoID}&lkpModule=${lkpModule}`,
        );

        if (!docListResponse.ok) {
          throw new Error(`HTTP Error: ${docListResponse.status}`);
        }

        const docListResult = await docListResponse.json();

        if (!docListResult.success) {
          console.error("getDocumentList failed:", docListResult.message);
          return;
        }

        const documentRows: {
          lkpDocument: string;
          txtDocumentName: string;
        }[] = docListResult.data || [];

        setDocumentOptions(
          documentRows.map((doc) => ({
            value: doc.lkpDocument,
            label: doc.txtDocumentName,
          })),
        );

        let existingRows: Record<string, any> = {};

        if (lkpYear && lkpBranch) {
          const docNoResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/DocumentNo/getDocumentNoList?PstrCoID=${PstrCoID}&lkpYear=${lkpYear}&lkpBranch=${lkpBranch}&lkpModule=${lkpModule}`,
          );

          if (docNoResponse.ok) {
            const docNoResult = await docNoResponse.json();

            if (docNoResult.success) {
              existingRows = (docNoResult.data || []).reduce(
                (accumulator: Record<string, any>, row: any) => {
                  accumulator[row.lkpDocument] = row;
                  return accumulator;
                },
                {},
              );
            }
          }
        }

        setHasSavedRows(Object.keys(existingRows).length > 0);

        setRows(
          documentRows.map((doc, index) => {
            const existing = existingRows[doc.lkpDocument];

            return {
              id: index + 1,
              lkpDocument: doc.lkpDocument,
              lkpMode: existing?.lkpMode || "Auto",
              txtDocPrefix: existing?.txtDocPrefix || "",
              txtStartSeqNo: existing?.txtStartSeqNo || "",
              chkStrictSerial: existing?.chkStrictSerial ?? false,
              lkpResetNo: existing?.lkpResetNo || "Never",
              chkPrintAfterSave:
                existing?.chkPrintAfterSave === 1 ||
                existing?.chkPrintAfterSave === true,
              txtPositionNo: index + 1,
            };
          }),
        );
      } catch (error) {
        console.error("loadDocumentGrid error:", error);
      }
    };

    loadDocumentGrid();
  }, [lkpYear, lkpBranch, lkpModule, reloadKey]);

  // ==========================================================
  // BUTTON STATE
  // ==========================================================

  const [CopyToNextYearbtn, setCopyToNextYearbtn] = useState<boolean>(false);

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const handleRowChange = <K extends keyof DocumentRow>(
    id: number,
    field: K,
    value: DocumentRow[K],
  ) => {
    setRows((previousRows) =>
      previousRows.map((row) =>
        row.id === id
          ? {
            ...row,
            [field]: value,
          }
          : row,
      ),
    );
  };

  // ==========================================================
  // SAVE
  // ==========================================================

  // The one button: Save the first time, Modify once this Year + Branch +
  // Module has numbering (the old form switched its button text between
  // "&Save" and "&Modify").
  const actionWord = "Save";
  const canSaveOrModify = hasSavedRows ? perms.modify : perms.save;

  const handleSave = async () => {
    if (!canSaveOrModify) {
      notify.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    if (!lkpYear) {
      notify.warning("Please select 'Year'");
      document.getElementById("lkpYear")?.focus();
      return;
    }

    if (!lkpBranch) {
      notify.warning("Please select 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    if (!lkpModule) {
      notify.warning("Please select 'Module'");
      document.getElementById("lkpModule")?.focus();
      return;
    }

    const validRows = rows.filter(
      (row) =>
        row.txtDocPrefix.trim() !== "" || row.txtStartSeqNo.trim() !== "",
    );

    if (validRows.length === 0) {
      notify.warning("There is no information for saving.");
      document.getElementById(`txtDocPrefix_${rows[0]?.id ?? 1}`)?.focus();
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrUserID) {
      notify.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    try {
      // the time of the save: the database server's clock (the common /datetime/server-date), written on every row
      const dtpServerDate = await tryGetServerDate();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/DocumentNo/saveDocumentNo`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            lkpYear,
            lkpBranch,
            lkpModule,
            PstrUserID,
            dtpServerDate,
            rows: validRows.map((row) => ({
              lkpDocument: row.lkpDocument,
              txtDocPrefix: row.txtDocPrefix || null,
              txtStartSeqNo: row.txtStartSeqNo || null,
              chkStrictSerial: row.chkStrictSerial,
              lkpMode: row.lkpMode || null,
              lkpResetNo: row.lkpResetNo || null,
              chkPrintAfterSave: row.chkPrintAfterSave ? 1 : 0,
              txtPositionNo: row.txtPositionNo,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.error(
          result.message ||
          "Not saved, try again.",
        );

        // the backend validator names the field that failed - same name as
        // the element id, so the cursor goes straight into it
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      notify.success(
        result.message || "Set Document No. saved successfully.",
      );

      // load the grid again: it now has saved numbering, so the button
      // flips from Save to Modify
      setReloadKey((previous) => previous + 1);
    } catch (error) {
      console.error("saveDocumentNo error:", error);
      notify.error("Cannot connect to Document No API.");
    }
  };

  // ==========================================================
  // CLEAR
  // ==========================================================
  //@ts-ignore
  const handleClear = () => {
    setLkpYear("");
    setLkpBranch("");
    setLkpModule("");
    setRows([]);

    setCopyToNextYearbtn(false);
  };

  // ==========================================================
  // KEYBOARD SHORTCUTS
  // The key of the Payment screen: Ctrl+S Save (nothing saved yet) or Modify (saved numbering).
  // ==========================================================

  useCtrlShortcuts({
    s: () => handleSave(),
  });

  // ==========================================================
  // DELETE ONE ROW
  // ==========================================================

  const handleDeleteRow = async (row: DocumentRow) => {
    if (!perms.delete) {
      notify.error("You do not have permission to Delete.");
      return;
    }

    if (!lkpYear || !lkpBranch || !lkpModule) {
      notify.warning("Year, Branch and Module are required.");
      return;
    }

    const documentName =
      documentOptions.find((option) => option.value === row.lkpDocument)
        ?.label || row.lkpDocument;

    const branchName =
      branchOptions.find((option) => option.value === lkpBranch)
        ?.label || lkpBranch;

    const shouldDelete = await confirm({
      title: "Set Document No.",
      message: "Do you want to Delete?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });

    if (!shouldDelete) {
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrUserID) {
      notify.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/DocumentNo/deleteDocumentNoRow`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            lkpYear,
            lkpBranch,
            lkpModule,
            lkpDocument: row.lkpDocument,
            documentName,
            branchName,
            PstrUserID,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.error(result.message || "Not deleted, try again");
        return;
      }

      // the common message of a delete (hooks/useDeleteToast.ts, the same on every screen)
      notify.success(deleteSuccessMessage("Set Document No."));

      setRows((previousRows) =>
        previousRows.map((r) =>
          r.id === row.id
            ? {
              ...r,
              lkpMode: "Auto",
              txtDocPrefix: "",
              txtStartSeqNo: "",
              chkStrictSerial: false,
              lkpResetNo: "Never",
              chkPrintAfterSave: false,
            }
            : r,
        ),
      );
    } catch (error) {
      console.error("deleteDocumentNoRow error:", error);
      notify.error("Not deleted, try again");
    }
  };

  // ==========================================================
  // GET OPTION
  // ==========================================================

  const getOption = (
    options: SelectOption[],
    value: string,
  ): SelectOption | null => {
    return options.find((item) => item.value === value) ?? null;
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <div
        onKeyDown={handleEnterAsTab}
        className="flex min-h-screen w-full items-center justify-center bg-white text-[13px] text-slate-700"
      >
        {/* =====================================================
          MAIN CONTAINER
      ====================================================== */}

        <div className="mx-auto w-full border border-slate-400 bg-white shadow-sm sm:w-[75%] lg:w-[75%]
        "
        >
          <Header Name="Set Document No." />

          <div className="p-3 ">

            <div className="grid grid-cols-1 gap-3 border-b border-slate-200 pb-3 sm:grid-cols-2
             lg:grid-cols-[200px_1fr_1fr] lg:items-center lg:gap-4">
              {/* ===================================================
              YEAR
          ==================================================== */}

              <div className="flex w-full items-center gap-2">
                <label
                  htmlFor="lkpYear"
                  className="w-[56px] shrink-0 pr-3 text-right text-[14px] text-gray-600"
                >
                  Year :
                </label>

                <div className="w-[108px] shrink-0">
                  <CommonTableSelect
                    inputId="lkpYear"
                    options={yearOptions}
                    value={getOption(yearOptions, lkpYear)}
                    onChange={(option: TableSelectOption | null) =>
                      setLkpYear(option?.value ?? "")
                    }
                    columns={[{ key: "label", label: "Year", width: "1fr" }]}
                    width="108px"
                    menuWidth="108px"
                    noOptionsMessage={() => "No Year Found"}
                    isSearchable
                    controlHeight={30}
                    menuPortalTarget={document.body}
                    showHeader={false}
                  />
                </div>
              </div>

              {/* ===================================================
              BRANCH
              =============================================== */}

              <div className="flex w-full items-center gap-2 sm:justify-center">
                <label
                  htmlFor="lkpBranch"
                  className="shrink-0 pr-3 text-right text-[14px] text-gray-600"
                >
                  Branch :
                </label>

                <div className="w-full sm:w-[180px] lg:w-[212px]
              "
                >
                  <CommonTableSelect
                    inputId="lkpBranch"
                    options={branchOptions}
                    value={getOption(
                      branchOptions,
                      lkpBranch
                    )}
                    onChange={(option: TableSelectOption | null) =>
                      setLkpBranch(
                        option?.value ?? ""
                      )
                    }
                    columns={BRANCH_COLUMNS}
                    width="100%"
                    menuWidth="calc(100% + 70px)"
                    filterOption={filterLabelOrValue}
                    noOptionsMessage={() => "No Branch Found"}
                    isSearchable
                    controlHeight={30}
                    menuPortalTarget={document.body}
                  />
                </div>
              </div>

              {/* ===================================================
              MODULE
              ==================================================== */}

              <div className="flex w-full items-center gap-2 sm:justify-center">
                <label
                  htmlFor="lkpModule"
                  className="shrink-0 pr-3 text-right text-[14px] text-gray-600"
                >
                  Module :
                </label>

                <div className="w-full lg:w-[150px]">
                  <CommonTableSelect
                    inputId="lkpModule"
                    options={moduleOptions}
                    value={getOption(moduleOptions, lkpModule)}
                    onChange={(option: TableSelectOption | null) =>
                      setLkpModule(option?.value ?? "")
                    }
                    columns={[{ key: "label", label: "Module", width: "1fr" }]}
                    width="100%"
                    menuWidth="150px"
                    isSearchable={false}
                    controlHeight={30}
                    menuPortalTarget={document.body}
                    showHeader={false}
                  />
                </div>
              </div>
            </div>

            <div>

              <div className="w-full border-l border-r border-b border-slate-200">

                {/* =================================================
                 TABLE
                ================================================= */}

                <div className="mt-2 w-full">

                  <table className="w-full table-fixed border-collapse border border-slate-200 text-[11px]"
                  >
                    <thead>
                      <tr className="h-9 bg-slate-50 text-left text-[14px] text-gray-600"
                      >
                        {/* DOCUMENT */}

                        <th className="w-[20%] border-r border-slate-200 pl-[2px] pr-1 whitespace-nowrap">
                          Document
                        </th>

                        {/* PREFIX */}

                        <th className="w-[9%] border-r border-slate-200 pl-[2px] pr-1 whitespace-nowrap">
                          Prefix
                        </th>

                        {/* START SEQ NO */}

                        <th className="w-[13%] border-r border-slate-200 pl-[2px] pr-1 text-left whitespace-nowrap">
                          Start Seq. No.
                        </th>

                        {/* STRICT SERIAL */}

                        <th className="w-[12%] border-r border-slate-200 pl-[2px] pr-1 text-left whitespace-nowrap">
                          Strict Serial
                        </th>

                        {/* MODE */}

                        <th className="w-[10%] border-r border-slate-200 pl-[2px] pr-1 text-left whitespace-nowrap">
                          + Mode
                        </th>

                        {/* RESET */}

                        <th className="w-[10%] border-r border-slate-200 pl-[2px] pr-1 text-left whitespace-nowrap">
                          Reset No.
                        </th>

                        {/* PRINT AFTER SAVE */}

                        <th className=" w-[15%] border-r border-slate-200 px-1 text-centerwhitespace-nowrap">
                          Print After Save
                        </th>

                        {/* POSITION NO */}

                        <th className="w-[13%] px-1 text-center whitespace-nowrap">
                          Position No.
                        </th>
                      </tr>
                    </thead>

                    {/* =================================================
        TABLE BODY
    ================================================= */}

                    <tbody>
                      {rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={`h-[34px] ${index === 0 ? "bg-[#edf4fc]" : "bg-white"} hover:bg-slate-50`}
                        >
                          {/* =================================================
              DOCUMENT
          ================================================= */}

                          <td className={`border-r border-t border-slate-200 p-0 ${cellFocusClass}`}>

                            <div className="flex h-[36px] items-stretch">

                              <div
                                className="min-w-0 flex-1 overflow-hidden"
                                onKeyDown={(event) => advanceOnEnter(event)}
                              >

                                <CustomTableSelect
                                  valuePadding="0 2px"
                                  inputId={`lkpDocument_${row.id}`}
                                  options={documentOptions}
                                  value={getOption(
                                    documentOptions,
                                    row.lkpDocument,
                                  )}
                                  onChange={(option: TableSelectOption | null) => {
                                    handleRowChange(
                                      row.id,
                                      "lkpDocument",
                                      option?.value ?? "",
                                    );
                                    if (option) advanceAfterPick(`lkpDocument_${row.id}`);
                                  }}
                                  columns={[{ key: "label", label: "Document", width: "1fr" }]}
                                  width="100%"
                                  menuWidth="220px"
                                  noOptionsMessage={() => "No Document Found"}
                                  isSearchable
                                  menuPortalTarget={document.body}
                                  controlHeight={36}
                                  showHeader={false}
                                />

                              </div>


                            </div>

                          </td>


                          {/* =================================================
              PREFIX
          ================================================= */}

                          <td className={`border-r border-t border-slate-200 pl-[2px] pr-1 ${cellFocusClass}`}>
                            <input
                              id={`txtDocPrefix_${row.id}`}
                              onFocus={selectOnFocus}
                              name="txtDocPrefix"
                              type="text"
                              value={row.txtDocPrefix}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  "txtDocPrefix",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-transparent text-left text-[13px] text-slate-600 outline-none"
                            />
                          </td>

                          {/* =================================================
              START SEQ NO
          ================================================= */}

                          <td className={`border-r border-t border-slate-200 px-1 ${cellFocusClass}`}>
                            <input
                              id={`txtStartSeqNo_${row.id}`}
                              onFocus={selectOnFocus}
                              name="txtStartSeqNo"
                              type="text"
                              value={row.txtStartSeqNo}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  "txtStartSeqNo",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-transparent text-center text-[13px] text-slate-600 outline-none"
                            />
                          </td>

                          {/* =================================================
              STRICT SERIAL
          ================================================= */}

                          <td className={`border-r border-t border-slate-200 text-center ${cellFocusClass}`}
                          >
                            <input
                              id={`chkStrictSerial_${row.id}`}
                              name="chkStrictSerial"
                              type="checkbox"
                              checked={row.chkStrictSerial}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  "chkStrictSerial",
                                  e.target.checked,
                                )
                              }
                              className="h-[16px] w-[16px] cursor-pointer accent-blue-600"
                            />
                          </td>

                          {/* =================================================
              MODE
          ================================================= */}

                          <td className={`border-r border-t border-slate-200 p-0 ${cellFocusClass}`}
                          >
                            <CustomTableSelect
                              valuePadding="0 2px"
                              inputId={`lkpMode_${row.id}`}
                              options={modeOptions}
                              value={getOption(modeOptions, row.lkpMode)}
                              onChange={(option: TableSelectOption | null) => {
                                handleRowChange(
                                  row.id,
                                  "lkpMode",
                                  option?.value ?? "",
                                );
                                if (option) advanceAfterPick(`lkpMode_${row.id}`);
                              }}
                              columns={[{ key: "label", label: "Mode", width: "1fr" }]}
                              width="100%"
                              menuWidth="180px"
                              isSearchable={false}
                              menuPortalTarget={document.body}
                              controlHeight={36}
                              showHeader={false}
                            />
                          </td>

                          {/* =================================================
              RESET NO
          ================================================= */}

                          <td className={`border-r border-t border-slate-200 p-0 ${cellFocusClass}`}
                          >
                            <CustomTableSelect
                              valuePadding="0 2px"
                              inputId={`lkpResetNo_${row.id}`}
                              options={resetOptions}
                              value={getOption(resetOptions, row.lkpResetNo)}
                              onChange={(option: TableSelectOption | null) => {
                                handleRowChange(
                                  row.id,
                                  "lkpResetNo",
                                  option?.value ?? "",
                                );
                                if (option) advanceAfterPick(`lkpResetNo_${row.id}`);
                              }}
                              columns={[{ key: "label", label: "Reset No", width: "1fr" }]}
                              width="100%"
                              menuWidth="180px"
                              isSearchable={false}
                              menuPortalTarget={document.body}
                              controlHeight={36}
                              showHeader={false}
                            />
                          </td>

                          {/* =================================================
              PRINT AFTER SAVE
          ================================================= */}

                          <td className={`border-r border-t border-slate-200 text-center ${cellFocusClass}`}
                          >
                            <input
                              id={`chkPrintAfterSave_${row.id}`}
                              name="chkPrintAfterSave"
                              type="checkbox"
                              checked={row.chkPrintAfterSave}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  "chkPrintAfterSave",
                                  e.target.checked,
                                )
                              }
                              className="h-[16px] w-[16px] cursor-pointer accent-blue-600"
                            />
                          </td>

                          {/* =================================================
              POSITION NO
          ================================================= */}

                          <td className={`border-t border-slate-200 px-1 text-center ${cellFocusClass}`}
                          >
                            <div className="flex items-center">
                              <input
                                id={`txtPositionNo_${row.id}`}
                                onFocus={selectOnFocus}
                                name="txtPositionNo"
                                type="number"
                                value={row.txtPositionNo}
                                onChange={(e) =>
                                  handleRowChange(
                                    row.id,
                                    "txtPositionNo",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full bg-transparent text-right text-[13px] text-slate-600 outline-none"
                              />

                              {/* the X of the row, at the right end */}
                              {perms.delete && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => handleDeleteRow(row)}
                                  className="ml-1 inline-flex h-[24px] w-[20px] shrink-0 items-center justify-center text-slate-400 hover:text-red-500"
                                  aria-label={`Delete ${row.lkpDocument}`}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* =====================================================
            BUTTONS
        ====================================================== */}

            <TransactionActions
              className="mt-[14px] flex justify-center gap-3"
              actions={[
                {
                  id: "Save",
                  label: actionWord,
                  underlineIndex: 0,
                  onClick: handleSave,
                  disabled: !canSaveOrModify,
                },
                {
                  id: "CopyToNextYearbtn",
                  label: "Copy To Next Year",
                  onClick: () => setCopyToNextYearbtn(!CopyToNextYearbtn),
                },
              ]}
            />

          </div>
        </div>

      </div>

      {/* the "Do you want to delete ?" question - outside the root div so the page's
        Enter handling does not take the Enter of the Yes / No buttons */}
      {dialog}
      {messageDialog}
    </>
  );
};

export default SetDocumentNo;