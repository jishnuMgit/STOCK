import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import SalesPriceListHeader from "../../../components/Setup/SalesPriceList/SalesPriceListHeader";
import SalesPriceListTable from "../../../components/Setup/SalesPriceList/SalesPriceListTable";
import SalesPriceListFooter from "../../../components/Setup/SalesPriceList/SalesPriceListFooter";
import {
  type Option,
  type PriceRow,
  round2,
} from "../../../components/Setup/SalesPriceList/SalesPriceListShared";
import type { PairOption } from "../../../components/PairSelect/pairSelectParts";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

// ============================================================
// SALES PRICE LIST (the old frmEditPriceList)
//
// Shows the items of a Branch (all item groups, or one) with the Unit Cost and the
// Unit Price. The Unit Price can be typed in the grid (once "Apply to Unit Price"
// is ticked), or made for every item as cost + cost x "Increase Price By %"
// (One Item Group). Modify saves only the items whose price changed - in this
// branch, or in all branches ("Apply To All Branches").
//
// Names follow the rule: state = element id/name = payload key = response key
// (lkpBranch, rdgItemGroup, lkpItemGroupID, txtIncreasePercent, chkApplyUnitPrice,
// lkpItemID, txtUnitPrice ...).
// ============================================================

// tblmenu: 020202 = mnuSalesPriceList ("Sales Price List", its only button is M)
const MENU_ID = "020202";

const api = import.meta.env.VITE_API_URL;

interface ItemGroup {
  lkpItemGroupID: string;
  lkpItemGroupName: string;
}

// the server names the field by its element id / name
const focusField = (field?: string) => {
  if (!field) return;

  const element =
    document.getElementById(field) ??
    document.querySelector<HTMLElement>(`[name="${field}"]`);

  element?.focus();
};

type SalesPriceListPageProps = {
  onClose?: () => void;
};

const SalesPriceListPage: React.FC<SalesPriceListPageProps> = ({ onClose }) => {
  const perms = useButtonPermissions(MENU_ID);

  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null);
  const [chkApplyToAllBranches, setChkApplyToAllBranches] = useState(false);

  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  // the old form opened on All Item Group (1), where the prices can be typed at once
  const [rdgItemGroup, setRdgItemGroup] = useState(1);
  const [lkpItemGroupID, setLkpItemGroupID] = useState("");

  const [txtIncreasePercent, setTxtIncreasePercent] = useState("0.00");
  const [chkApplyUnitPrice, setChkApplyUnitPrice] = useState(true);

  const [chkFindOpen, setChkFindOpen] = useState(false);
  const [txtFind, setTxtFind] = useState("");

  const [rows, setRows] = useState<PriceRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // bumped by Cancel and after a Modify so the grid is loaded again
  const [reloadKey, setReloadKey] = useState(0);

  // only the answer of the latest request may fill the grid
  const gridRequest = useRef(0);

  // ----------------------------------------------------------
  // LISTS: the branches of the user, the item groups
  // ----------------------------------------------------------

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getBranchList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${api}/SalesPriceList/getBranchList?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(`getBranchList failed: ${result.message}`);
          return;
        }

        const options: Option[] = (result.data || []).map(
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          }),
        );

        setBranchOptions(options);
        setLkpBranch(
          options.find((option) => option.value === result.lkpDefaultBranch) ??
            null,
        );
      } catch (error: unknown) {
        console.error("getBranchList error:", error);
        toast.error("Failed to load branch list");
      }
    };

    const loadItemGroups = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) return;

        const response = await fetch(
          `${api}/SalesPriceList/getItemGroupList?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(`getItemGroupList failed: ${result.message}`);
          return;
        }

        setItemGroups(result.data || []);
      } catch (error: unknown) {
        console.error("getItemGroupList error:", error);
        toast.error("Failed to load item group list");
      }
    };

    loadBranches();
    loadItemGroups();
  }, []);

  // ----------------------------------------------------------
  // THE GRID: loaded again when the Branch, One / All Item Group or the Item
  // Group changes (as the old getData), and after Cancel / Modify. Unsaved
  // prices are dropped by that, like the old form.
  // ----------------------------------------------------------

  useEffect(() => {
    const requestNo = ++gridRequest.current;

    const loadGrid = async () => {
      // nothing to ask for until a branch (and, for One Item Group, a group)
      if (!lkpBranch || (rdgItemGroup === 0 && lkpItemGroupID === "")) {
        setRows([]);
        setActiveId(null);
        return;
      }

      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrYear = localStorage.getItem("PstrYear");

        if (!PstrCoID || !PstrYear) {
          toast.error("getSalesPriceList: no PstrCoID / PstrYear in localStorage");
          return;
        }

        const params = new URLSearchParams({
          PstrCoID,
          PstrYear,
          lkpBranch: lkpBranch.value,
          rdgItemGroup: String(rdgItemGroup),
          lkpItemGroupID: rdgItemGroup === 0 ? lkpItemGroupID : "",
        });

        const response = await fetch(
          `${api}/SalesPriceList/getSalesPriceList?${params.toString()}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (requestNo !== gridRequest.current) return;

        if (!response.ok || !result.success) {
          toast.error(`getSalesPriceList failed: ${result.message}`);
          setRows([]);
          return;
        }

        const loaded: PriceRow[] = (result.data || []).map(
          (row: {
            lkpItemID: string;
            txtItemName: string | null;
            txtUnit: string | null;
            txtUnitCost: string | number;
            txtUnitPrice: string | number;
            lkpItemGroupID: string | null;
          }) => ({
            lkpItemID: row.lkpItemID,
            txtItemName: row.txtItemName ?? "",
            txtUnit: row.txtUnit ?? "",
            txtUnitCost: Number(row.txtUnitCost) || 0,
            txtUnitPrice: Number(row.txtUnitPrice) || 0,
            txtOriginalUnitPrice: Number(row.txtUnitPrice) || 0,
            lkpItemGroupID: row.lkpItemGroupID ?? "",
          }),
        );

        setRows(loaded);
        setActiveId(loaded[0]?.lkpItemID ?? null);
      } catch (error: unknown) {
        if (requestNo !== gridRequest.current) return;

        console.error("getSalesPriceList error:", error);
        toast.error("Failed to load the Sales Price List");
      }
    };

    loadGrid();
  }, [lkpBranch, rdgItemGroup, lkpItemGroupID, reloadKey]);

  // ----------------------------------------------------------
  // WHAT THE BOXES SHOW
  // ----------------------------------------------------------

  const groupIdOptions = useMemo<PairOption[]>(
    () =>
      itemGroups.map((group) => ({
        value: group.lkpItemGroupID,
        label: group.lkpItemGroupID,
        id: group.lkpItemGroupID,
        name: group.lkpItemGroupName,
      })),
    [itemGroups],
  );

  const groupNameOptions = useMemo<PairOption[]>(
    () =>
      [...itemGroups]
        .sort((a, b) => a.lkpItemGroupName.localeCompare(b.lkpItemGroupName))
        .map((group) => ({
          value: group.lkpItemGroupID,
          label: group.lkpItemGroupName,
          id: group.lkpItemGroupID,
          name: group.lkpItemGroupName,
        })),
    [itemGroups],
  );

  // rows shown in the grid (the Find box filters what is loaded)
  const visibleRows = useMemo(() => {
    const search = txtFind.trim().toLowerCase();

    if (!search) return rows;

    return rows.filter(
      (row) =>
        row.lkpItemID.toLowerCase().includes(search) ||
        row.txtItemName.toLowerCase().includes(search),
    );
  }, [rows, txtFind]);

  const changedRows = rows.filter(
    (row) => row.txtUnitPrice !== row.txtOriginalUnitPrice,
  );

  // ----------------------------------------------------------
  // ONE / ALL ITEM GROUP, ITEM GROUP, BRANCH
  // ----------------------------------------------------------

  // the old rdgItemGroup_SelectedIndexChanged: All Item Group ticks "Apply to
  // Unit Price" (prices typed at once), One Item Group unticks it and zeroes the %
  const handleRdgItemGroupChange = (value: number) => {
    setRdgItemGroup(value);
    setTxtIncreasePercent("0.00");
    setChkApplyUnitPrice(value === 1);
    setChkFindOpen(false);
    setTxtFind("");
  };

  // ----------------------------------------------------------
  // PRICES
  // ----------------------------------------------------------

  // every price = cost + cost x % / 100 (the old setSellingPrices: on the COST)
  const applyIncrease = (percentText: string) => {
    const percent = parseFloat(percentText);
    const factor = Number.isFinite(percent) ? percent : 0;

    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        txtUnitPrice: round2(row.txtUnitCost + (row.txtUnitCost * factor) / 100),
      })),
    );
  };

  const handlePercentCommit = () => {
    const parsed = parseFloat(txtIncreasePercent);

    setTxtIncreasePercent(Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00");

    if (chkApplyUnitPrice && rows.length > 0) applyIncrease(txtIncreasePercent);
  };

  const handlePriceChange = (lkpItemID: string, value: number) => {
    const row = rows.find((entry) => entry.lkpItemID === lkpItemID);

    // the old only told the user - it did not stop the price
    if (row && value !== row.txtUnitPrice && value < row.txtUnitCost) {
      toast.info("'Unit Price' is less than 'Unit Cost'");
    }

    setRows((previous) =>
      previous.map((entry) =>
        entry.lkpItemID === lkpItemID
          ? { ...entry, txtUnitPrice: value }
          : entry,
      ),
    );
  };

  // ----------------------------------------------------------
  // CANCEL / FIND / CLOSE
  // ----------------------------------------------------------

  // the old ClearMe: the % and ticks back to their start, the grid loaded again
  const handleCancel = () => {
    setTxtIncreasePercent("0.00");
    setChkApplyUnitPrice(rdgItemGroup === 1);
    setChkApplyToAllBranches(false);
    setChkFindOpen(false);
    setTxtFind("");
    setReloadKey((previous) => previous + 1);
  };

  const handleFind = () => {
    setChkFindOpen((previous) => !previous);
    setTxtFind("");
  };

  const handleClose = () => {
    if (onClose) onClose();
    else window.history.back();
  };

  // ----------------------------------------------------------
  // MODIFY (the old cmdSave_Click): the server checks everything again, and the
  // right to Modify
  // ----------------------------------------------------------

  const handleModify = async () => {
    if (saving || !perms.modify) return;

    if (!lkpBranch) {
      toast.info("Please Select 'Branch'");
      focusField("lkpBranch");
      return;
    }

    if (rdgItemGroup === 0 && lkpItemGroupID === "") {
      toast.info("Please Select 'Item Group'");
      focusField("lkpItemGroupID");
      return;
    }

    if (rows.length === 0) {
      toast.info("There is no data in the grid to modify");
      return;
    }

    if (changedRows.length === 0) {
      toast.info("No Unit Price is changed");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/SalesPriceList/modifySalesPriceList`, {
        method: "POST",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          lkpBranch: lkpBranch.value,
          rdgItemGroup,
          lkpItemGroupID: rdgItemGroup === 0 ? lkpItemGroupID : "",
          chkApplyToAllBranches,
          rows: changedRows.map((row) => ({
            lkpItemID: row.lkpItemID,
            txtUnitPrice: row.txtUnitPrice,
            txtOriginalUnitPrice: row.txtOriginalUnitPrice,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Not Modified,Try again");
        focusField(result.field);
        return;
      }

      toast.success("Sales Price List modified successfully");

      // the old ClearMe, then the grid again (with the new prices)
      handleCancel();
    } catch (error: unknown) {
      console.error("modifySalesPriceList error:", error);
      toast.error("Not Modified,Try again");
    } finally {
      setSaving(false);
    }
  };

  // Alt+M Modify, Alt+F Find, Alt+C Cancel, Alt+O Close
  useAltShortcuts({
    m: handleModify,
    f: handleFind,
    c: handleCancel,
    o: handleClose,
  });

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-250 min-w-250 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Sales Price List
            </h1>
          </header>

          <section className="flex flex-col gap-3 px-3.5 pb-6 pt-3">
            <SalesPriceListHeader
              branchOptions={branchOptions}
              lkpBranch={lkpBranch}
              onBranchChange={setLkpBranch}
              chkApplyToAllBranches={chkApplyToAllBranches}
              onChkApplyToAllBranchesChange={setChkApplyToAllBranches}
              rdgItemGroup={rdgItemGroup}
              onRdgItemGroupChange={handleRdgItemGroupChange}
              groupIdOptions={groupIdOptions}
              groupNameOptions={groupNameOptions}
              lkpItemGroupID={lkpItemGroupID}
              onItemGroupChange={setLkpItemGroupID}
              txtIncreasePercent={txtIncreasePercent}
              onPercentChange={setTxtIncreasePercent}
              onPercentCommit={handlePercentCommit}
              chkApplyUnitPrice={chkApplyUnitPrice}
              onChkApplyUnitPriceChange={setChkApplyUnitPrice}
              showFind={chkFindOpen}
              txtFind={txtFind}
              onTxtFindChange={setTxtFind}
            />

            <div>
              <SalesPriceListTable
                rows={visibleRows}
                activeId={activeId}
                locked={!chkApplyUnitPrice}
                onActivateRow={setActiveId}
                onPriceChange={handlePriceChange}
              />
              <SalesPriceListFooter
                itemCount={visibleRows.length}
                canModify={perms.modify && changedRows.length > 0 && !saving}
                onModify={handleModify}
                onFind={handleFind}
                onCancel={handleCancel}
                onClose={handleClose}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SalesPriceListPage;
