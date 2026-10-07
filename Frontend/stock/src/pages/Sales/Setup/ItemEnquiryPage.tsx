import React, { useState } from "react";
import ItemEnquiryHeader from "../../../components/Setup/ItemEnquiry/ItemEnquiryHeader";
import ItemEnquiryTable from "../../../components/Setup/ItemEnquiry/ItemEnquiryTable";

// ============================================================
// TYPES
// ============================================================

export type Option = {
  value: string;
  label: string;
};

export type ItemData = {
  itemId: Option | null;
  itemName: Option | null;
  description: Option | null;
  unit: string;
  itemGroupId: string;
  itemGroupName: string;
  supplierId: string;
  supplierName: string;
  supplierItemId: string;
};

export type StockRow = {
  branch: string;
  stock: string;
  prevUnitCost: string;
  unitCost: string;
  salesPrice: string;
};

// ============================================================
// OPTIONS
// ============================================================

const itemIdOptions: Option[] = [
  {
    value: "ACCSS-1.5MM-CABL",
    label: "ACCSS-1.5MM-CABL",
  },
  {
    value: "CABLE-2.5MM",
    label: "CABLE-2.5MM",
  },
  {
    value: "CABLE-4MM",
    label: "CABLE-4MM",
  },
];

const itemNameOptions: Option[] = [
  {
    value: "Flex Cable 3C*1.5mm², 100Y,Ksa",
    label: "Flex Cable 3C*1.5mm², 100Y,Ksa",
  },
  {
    value: "Flex Cable 3C*2.5mm², 100Y,Ksa",
    label: "Flex Cable 3C*2.5mm², 100Y,Ksa",
  },
];

const descriptionOptions: Option[] = [
  {
    value: "FLEX CABLE",
    label: "FLEX CABLE",
  },
  {
    value: "ELECTRICAL CABLE",
    label: "ELECTRICAL CABLE",
  },
];

const initialItem: ItemData = {
  itemId: {
    value: "ACCSS-1.5MM-CABL",
    label: "ACCSS-1.5MM-CABL",
  },

  itemName: {
    value: "Flex Cable 3C*1.5mm², 100Y,Ksa",
    label: "Flex Cable 3C*1.5mm², 100Y,Ksa",
  },

  description: null,

  unit: "NOS.",

  itemGroupId: "36 - PROJECTS",

  itemGroupName: "",

  supplierId: "",

  supplierName: "",

  supplierItemId: "",
};

const initialRows: StockRow[] = [
  {
    branch: "",
    stock: "",
    prevUnitCost: "",
    unitCost: "",
    salesPrice: "",
  },
  {
    branch: "",
    stock: "",
    prevUnitCost: "",
    unitCost: "",
    salesPrice: "",
  },
  {
    branch: "",
    stock: "",
    prevUnitCost: "",
    unitCost: "",
    salesPrice: "",
  },
  {
    branch: "",
    stock: "",
    prevUnitCost: "",
    unitCost: "",
    salesPrice: "",
  },
  {
    branch: "",
    stock: "",
    prevUnitCost: "",
    unitCost: "",
    salesPrice: "",
  },
  {
    branch: "",
    stock: "",
    prevUnitCost: "",
    unitCost: "",
    salesPrice: "",
  },
];

// ============================================================
// COMPONENT
// ============================================================

const ItemEnquiryPage: React.FC = () => {
  const [item, setItem] =
    useState<ItemData>(initialItem);

  const [rows, setRows] =
    useState<StockRow[]>(initialRows);

  const [selectedRow, setSelectedRow] =
    useState(0);

  // ==========================================================
  // UPDATE ITEM
  // ==========================================================

  const updateItem = <K extends keyof ItemData>(
    field: K,
    value: ItemData[K],
  ) => {
    setItem((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ==========================================================
  // UPDATE TABLE ROW
  // ==========================================================

  const updateRow = <K extends keyof StockRow>(
    index: number,
    field: K,
    value: StockRow[K],
  ) => {
    setRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setItem({
      itemId: null,
      itemName: null,
      description: null,
      unit: "",
      itemGroupId: "",
      itemGroupName: "",
      supplierId: "",
      supplierName: "",
      supplierItemId: "",
    });

    setRows(
      initialRows.map((row) => ({
        ...row,
      })),
    );

    setSelectedRow(0);
  };

  return (
   <div className="flex min-h-screen w-full items-center justify-center bg-white">
  <div
    className="
      w-full
      max-w-[800px]
      border
      border-gray-400
      bg-white
    "
  >
    {/* ====================================================
        PAGE
    ===================================================== */}

    <main
      className="
        w-full
        min-h-fit
        bg-white
      "
    >
      {/* ==================================================
          PAGE TITLE
      ================================================== */}

      <div
        className="
          flex
          h-[36px]
          items-center
          border-b
          border-slate-300
          bg-[#a3dfc0]
        "
      >
        <span
          className="
            px-3
            text-[17px]
            font-semibold
            text-slate-700
          "
        >
          Item Enquiry
        </span>
      </div>

      {/* ==================================================
          HEADER COMPONENT
      ================================================== */}

      <ItemEnquiryHeader
        item={item}
        updateItem={updateItem}
        itemIdOptions={itemIdOptions}
        itemNameOptions={itemNameOptions}
        descriptionOptions={descriptionOptions}
      />

      {/* ==================================================
          TABLE COMPONENT
      ================================================== */}

      <ItemEnquiryTable
        rows={rows}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        updateRow={updateRow}
      />

      {/* ==================================================
          BOTTOM
      ================================================== */}

      <div
        className="
          flex
          h-[74px]
          items-center
          justify-end
          gap-[15px]
          mt-[10px]
          px-[30px]
          pb-6
        "
      >
        {/* TOTAL */}

        <div
          className="
            flex
            items-center
            gap-[8px]
             mr-59.5
          "
        >
          <span
            className="
              text-[13px]
              text-[#374151]
            "
          >
            Total :
          </span>

          <input
            type="text"
            value="0.000"
            readOnly
            className="
              h-[38px]
              w-[135px]
              rounded-[4px]
              border
              border-[#d6dde5]
              bg-white
              px-[8px]
             
              text-right
              text-[14px]
              text-[#263449]
              outline-none
            "
          />
        </div>

        {/* CLEAR */}

        <button
          type="button"
          onClick={handleClear}
          className="
           btn-style
          "
        >
          <span className="underline">
            C
          </span>
          lear
        </button>
      </div>
    </main>
  </div>
</div>
  );
};

export default ItemEnquiryPage;