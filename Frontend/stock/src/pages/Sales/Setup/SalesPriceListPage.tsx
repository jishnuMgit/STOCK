import React, { useMemo, useState } from "react";
import SalesPriceListHeader from "../../../components/Setup/SalesPriceList/SalesPriceListHeader";
import SalesPriceListTable from "../../../components/Setup/SalesPriceList/SalesPriceListTable";
import SalesPriceListFooter from "../../../components/Setup/SalesPriceList/SalesPriceListFooter";
import {type Option,type PriceRow, round2 } from "../../../components/Setup/SalesPriceList/SalesPriceListShared";

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];
const groupIdOptions: Option[] = [
  { value: "36", label: "36" },
  { value: "37", label: "37" },
];
const groupNameOptions: Option[] = [
  { value: "36", label: "PROJECTS" },
  { value: "37", label: "ELECTRICAL" },
];

/* Sample items. Replace with an API call that uses the branch and item group. */
const buildSampleRows = (): PriceRow[] => {
const sample: [string, string, string, string, number, number][] = [
  // Group 36 — 25 items
  ["36", "ACCSS-COPPER-WIRE", "Copper Wire 4mm 100m Roll", "ROL.", 45, 55],
  ["36", "ACCSS-DRAIN-PIPE", "PVC Drain Pipe 1/2 Inch", "PCS.", 8, 12],
  ["36", "ACCSS-INSULATION-3/4", "Rubber Insulation Tube 3/4 Inch", "MTR.", 15, 20],
  ["36", "ACCSS-CABLE-TIE", "Nylon Cable Tie 200mm Pack", "PKT.", 5, 8],
  ["36", "ACCSS-AC-FILTER", "Air Conditioner Filter Mesh", "NOS.", 10, 15],
  ["36", "ACCSS-SCREW-25MM", "Self Tapping Screw 25mm", "BOX.", 6, 9],
  ["36", "ACCSS-AC-BRACKET", "Outdoor AC Mounting Bracket", "SET.", 38, 48],
  ["36", "ACCSS-FOAM-TAPE", "Self Adhesive Foam Tape 10m", "ROL.", 7, 11],
  ["36", "ACCSS-PVC-TAPE", "PVC Electrical Insulation Tape", "ROL.", 2, 4],
  ["36", "ACCSS-COPPER-PIPE", "Copper Pipe 1/4 Inch", "MTR.", 18, 25],
  ["36", "ACCSS-AC-CAPACITOR", "AC Capacitor 35UF 450V", "NOS.", 12, 18],
  ["36", "ACCSS-DRAIN-HOSE", "Flexible AC Drain Hose", "MTR.", 4, 7],
  ["36", "ACCSS-THERMAL-PASTE", "Thermal Paste Compound 50g", "NOS.", 6, 10],
  ["36", "ACCSS-INSULATION-1IN", "Rubber Insulation Tube 1 Inch", "MTR.", 20, 27],
  ["36", "ACCSS-AC-REMOTE", "Universal AC Remote Control", "NOS.", 15, 22],
  ["36", "ACCSS-CABLE-CLIP", "Round Cable Clip 10mm", "PKT.", 3, 5],
  ["36", "ACCSS-WALL-PLUG", "Plastic Wall Plug 8mm", "PKT.", 4, 6],
  ["36", "ACCSS-COPPER-ELBOW", "Copper Pipe Elbow Connector", "NOS.", 5, 8],
  ["36", "ACCSS-AC-SENSOR", "Air Conditioner Temperature Sensor", "NOS.", 9, 14],
  ["36", "ACCSS-ALU-TAPE", "Aluminium Foil Tape 50mm", "ROL.", 8, 12],
  ["36", "ACCSS-PIPE-CLAMP", "Metal Pipe Clamp 1/2 Inch", "NOS.", 2, 4],
  ["36", "ACCSS-DRAIN-PUMP", "Mini AC Drain Water Pump", "NOS.", 55, 70],
  ["36", "ACCSS-AC-CONTACTOR", "AC Contactor 25A", "NOS.", 22, 30],
  ["36", "ACCSS-CLEANER", "AC Coil Cleaning Spray 500ml", "NOS.", 8, 13],
  ["36", "ACCSS-COPPER-TEE", "Copper Pipe Tee Connector", "NOS.", 7, 11],

  // Group 37 — 25 items
  ["37", "ELEC-MCB-32A", "Miniature Circuit Breaker 32A", "NOS.", 18.5, 22],
  ["37", "ELEC-SOCKET-13A", "13A Universal Wall Socket", "NOS.", 12, 16],
  ["37", "ELEC-LED-18W", "LED Panel Light 18W White", "NOS.", 22, 28],
  ["37", "ELEC-WIRE-1.5MM", "Single Core Copper Wire 1.5mm", "ROL.", 35, 42],
  ["37", "ELEC-SWITCH-2G", "Two Gang Light Switch 10A", "NOS.", 8.5, 12],
  ["37", "ELEC-EXTENSION-5M", "Extension Cable 5 Metre", "NOS.", 25, 32],
  ["37", "ELEC-MCB-16A", "Miniature Circuit Breaker 16A", "NOS.", 14, 18],
  ["37", "ELEC-DB-12WAY", "Distribution Board 12 Way", "NOS.", 65, 85],
  ["37", "ELEC-LED-9W", "LED Bulb 9W Cool White", "NOS.", 4, 7],
  ["37", "ELEC-PLUG-13A", "13A Three Pin Power Plug", "NOS.", 5, 8],
  ["37", "ELEC-FAN-CEILING", "Ceiling Fan 1200mm", "NOS.", 75, 95],
  ["37", "ELEC-CONDUIT-20MM", "PVC Electrical Conduit 20mm", "PCS.", 3, 5],
  ["37", "ELEC-CHANGEOVER", "Manual Changeover Switch 63A", "NOS.", 45, 60],
  ["37", "ELEC-ISOLATOR-40A", "Double Pole Isolator 40A", "NOS.", 18, 25],
  ["37", "ELEC-RELAY-12V", "Electromagnetic Relay 12V", "NOS.", 7, 12],
  ["37", "ELEC-TERMINAL-BLOCK", "Electrical Terminal Block 12 Way", "NOS.", 6, 10],
  ["37", "ELEC-FUSE-10A", "Cartridge Fuse 10A", "NOS.", 2, 4],
  ["37", "ELEC-INDICATOR-RED", "Panel Indicator Lamp Red", "NOS.", 3, 6],
  ["37", "ELEC-CABLE-GLAND", "Cable Gland 20mm", "NOS.", 2.5, 5],
  ["37", "ELEC-USB-SOCKET", "Dual USB Wall Socket", "NOS.", 18, 25],
  ["37", "ELEC-TIMER-SWITCH", "Digital Programmable Timer", "NOS.", 28, 38],
  ["37", "ELEC-POWER-CONTACTOR", "Power Contactor 32A", "NOS.", 25, 35],
  // Group 38 — 25 items
  ["38", "PLMB-ELBOW-25MM", "PVC Elbow 25mm White", "NOS.", 2.5, 4],
  ["38", "PLMB-VALVE-1IN", "Brass Ball Valve 1 Inch", "NOS.", 32, 40],
  ["38", "PLMB-TEE-32MM", "PVC Tee Connector 32mm", "NOS.", 3, 5],
  ["38", "PLMB-FLEX-HOSE", "Flexible Water Hose 60cm", "NOS.", 9, 14],
  ["38", "PLMB-CPVC-PIPE", "CPVC Pipe 20mm 3m", "PCS.", 14, 19],
  ["38", "PLMB-STOP-COCK", "Brass Stop Cock 1/2 Inch", "NOS.", 16, 23],
  ["38", "PLMB-ELBOW-20MM", "CPVC Elbow 20mm", "NOS.", 2, 4],
  ["38", "PLMB-TEE-20MM", "CPVC Tee Connector 20mm", "NOS.", 2.5, 4],
  ["38", "PLMB-REDUCER-32-20", "PVC Reducer 32mm to 20mm", "NOS.", 3, 5],
  ["38", "PLMB-BALL-VALVE-1/2", "Brass Ball Valve 1/2 Inch", "NOS.", 12, 18],
  ["38", "PLMB-WASTE-COUPLING", "Wash Basin Waste Coupling", "NOS.", 8, 13],
  ["38", "PLMB-SINK-TRAP", "PVC Kitchen Sink Bottle Trap", "NOS.", 10, 16],
  ["38", "PLMB-SHOWER-HEAD", "Handheld Shower Head", "NOS.", 12, 20],
  ["38", "PLMB-ANGLE-VALVE", "Chrome Angle Valve 1/2 Inch", "NOS.", 9, 15],
  ["38", "PLMB-BIB-COCK", "Brass Bib Cock 1/2 Inch", "NOS.", 11, 17],
  ["38", "PLMB-PILLAR-COCK", "Chrome Pillar Cock", "NOS.", 25, 38],
  ["38", "PLMB-FLUSH-VALVE", "Toilet Flush Valve", "NOS.", 18, 28],
  ["38", "PLMB-FLOAT-VALVE", "Water Tank Float Valve", "NOS.", 10, 16],
  ["38", "PLMB-PPR-PIPE-25", "PPR Pipe 25mm 4m", "PCS.", 18, 25],
  ["38", "PLMB-UNION-25MM", "PVC Union Connector 25mm", "NOS.", 4, 7],
  ["38", "PLMB-SOLVENT-500ML", "PVC Solvent Cement 500ml", "TIN.", 8, 12],
  ["38", "PLMB-PTFE-TAPE", "PTFE Thread Seal Tape", "ROL.", 1, 2],
  ["38", "PLMB-CLAMP-32MM", "Pipe Clamp 32mm", "NOS.", 2, 4],
  ["38", "PLMB-FLOOR-DRAIN", "Stainless Steel Floor Drain", "NOS.", 12, 20],
  ["38", "PLMB-WATER-HAMMER", "Water Hammer Arrestor", "NOS.", 22, 32],
];
  return sample.map(([groupId, itemId, itemName, unit, unitCost, price]) => ({
    id: itemId,
    groupId,
    itemId,
    itemName,
    unit,
    unitCost,
    basePrice: price,
    unitPrice: price,
  }));
};

type SalesPriceListPageProps = {
  onClose?: () => void;
};

const SalesPriceListPage: React.FC<SalesPriceListPageProps> = ({ onClose }) => {
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [applyAllBranches, setApplyAllBranches] = useState(false); // chkApplyToAllBranches

  const [groupMode, setGroupMode] = useState("One Item Group"); // optItemGroup
  const [groupId, setGroupId] = useState<string | null>(groupIdOptions[0].value); // lkpItemGroupID / lkpItemGroupName

  const [percent, setPercent] = useState("0.00"); // txtIncreasePercent
  const [applyPercent, setApplyPercent] = useState(false); // chkApplyUnitPrice

  const [showFind, setShowFind] = useState(false);
  const [query, setQuery] = useState("");

  const [rows, setRows] = useState<PriceRow[]>(buildSampleRows);
  const [activeId, setActiveId] = useState<string | null>(rows[0]?.id ?? null);

  // rows shown in the grid (item group filter + find)
  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupMode === "One Item Group" && row.groupId !== groupId) return false;
      if (
        search &&
        !row.itemId.toLowerCase().includes(search) &&
        !row.itemName.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, groupMode, groupId, query]);

  const modifiedCount = rows.filter((r) => r.unitPrice !== r.basePrice).length;

  // set every unit price to base price + the given percent
  const applyIncrease = (pctText: string) => {
    const pct = parseFloat(pctText);
    const factor = 1 + (Number.isFinite(pct) ? pct : 0) / 100;
    setRows((prev) =>
      prev.map((row) =>
        visibleRows.some((v) => v.id === row.id)
          ? { ...row, unitPrice: round2(row.basePrice * factor) }
          : row,
      ),
    );
  };

  const handleApplyPercentChange = (checked: boolean) => {
    setApplyPercent(checked);
    if (checked) applyIncrease(percent);
  };

  const handlePercentCommit = () => {
    const parsed = parseFloat(percent);
    setPercent(Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00");
    if (applyPercent) applyIncrease(percent);
  };

  const handlePriceChange = (id: string, value: number) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, unitPrice: value } : row)),
    );
  };

  const handleModify = () => {
    const changed = rows.filter((r) => r.unitPrice !== r.basePrice);
    console.log({
      branch,
      applyToAllBranches: applyAllBranches,
      items: changed.map((r) => ({ itemId: r.itemId, unitPrice: r.unitPrice })),
    });
    // after a successful API call, treat the new prices as the saved prices
    setRows((prev) => prev.map((row) => ({ ...row, basePrice: row.unitPrice })));
  };

  const handleFind = () => {
    setShowFind((prev) => !prev);
    setQuery("");
  };

  const handleCancel = () => {
    // drop all unsaved price edits
    setRows((prev) => prev.map((row) => ({ ...row, unitPrice: row.basePrice })));
    setPercent("0.00");
    setApplyPercent(false);
    setShowFind(false);
    setQuery("");
  };

  const handleClose = () => {
    handleCancel();
    setBranch(branchOptions[0]);
    setApplyAllBranches(false);
    setGroupMode("One Item Group");
    setGroupId(groupIdOptions[0].value);
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-250 min-w-250 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Edit Price List
            </h1>
          </header>

          <section className="flex flex-col gap-3 px-3.5 pb-6 pt-3">
            <SalesPriceListHeader
              branchOptions={branchOptions}
              branch={branch}
              onBranchChange={setBranch}
              applyAllBranches={applyAllBranches}
              onApplyAllBranchesChange={setApplyAllBranches}
              groupMode={groupMode}
              onGroupModeChange={setGroupMode}
              groupIdOptions={groupIdOptions}
              groupNameOptions={groupNameOptions}
              groupId={groupId}
              onGroupChange={setGroupId}
              percent={percent}
              onPercentChange={setPercent}
              onPercentCommit={handlePercentCommit}
              applyPercent={applyPercent}
              onApplyPercentChange={handleApplyPercentChange}
              showFind={showFind}
              query={query}
              onQueryChange={setQuery}
            />

            <div>
              <SalesPriceListTable
                rows={visibleRows}
                activeId={activeId}
                onActivateRow={setActiveId}
                onPriceChange={handlePriceChange}
              />
              <SalesPriceListFooter
                itemCount={visibleRows.length}
                modifiedCount={modifiedCount}
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