import React from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";

import type {
  ItemData,
  Option,
} from "../../../pages/Sales/Setup/ItemEnquiryPage";

// ============================================================
// PROPS
// ============================================================

interface ItemEnquiryHeaderProps {
  item: ItemData;

  updateItem: <K extends keyof ItemData>(
    field: K,
    value: ItemData[K],
  ) => void;

  itemIdOptions: Option[];

  itemNameOptions: Option[];

  descriptionOptions: Option[];
}

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: 30,
    height: 30,

    width: "100%",

    border: "1px solid #d3dbe4",

    borderRadius: 4,

    boxShadow: "none",

    backgroundColor: state.isFocused
      ? "#f8fbff"
      : "#fff",

    "&:hover": {
      borderColor: "#b8c5d3",
    },

    fontSize: 12,
  }),

  valueContainer: (base) => ({
    ...base,

    height: 35,

    padding: "0 8px",
  }),

  singleValue: (base) => ({
    ...base,

    margin: 0,

    color: "#263449",

    fontSize: 12,

    whiteSpace: "nowrap",

    overflow: "hidden",

    textOverflow: "ellipsis",
  }),

  placeholder: (base) => ({
    ...base,

    color: "#64748b",

    fontSize: 12,
  }),

  input: (base) => ({
    ...base,

    margin: 0,

    padding: 0,

    fontSize: 12,
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: 35,
  }),

  dropdownIndicator: (base) => ({
    ...base,

    padding: "0 6px",

    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,

    zIndex: 9999,
  }),

  menu: (base) => ({
    ...base,

    fontSize: 12,

    marginTop: 2,

    zIndex: 9999,
  }),

  menuList: (base) => ({
    ...base,

    padding: 0,

    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,

    padding: "7px 9px",

    fontSize: 12,

    color: "#263449",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#fff",
  }),
};

// ============================================================
// LABEL
// ============================================================

interface FieldLabelProps {
  children: React.ReactNode;
  highlight?: boolean;
}

const FieldLabel: React.FC<FieldLabelProps> = ({
  children,
  highlight = false,
}) => {
  return (
    <label
      className="
        flex
        w-[125px]
        shrink-0
        items-center
        justify-end
        pr-[8px]
        text-[14px]
        text-[#374151]
      "
    >
      <span
        className={
          highlight
            ? "rounded-[3px]  px-[2px] "
            : ""
        }
      >
        {children}
      </span>

      <span className="ml-[3px]">
        :
      </span>
    </label>
  );
};

// ============================================================
// COMPONENT
// ============================================================

const ItemEnquiryHeader: React.FC<
  ItemEnquiryHeaderProps
> = ({
  item,
  updateItem,
  itemIdOptions,
  itemNameOptions,
  descriptionOptions,
}) => {
  return (
    <div
      className="
        w-full
        px-[24px]
        pt-6
      "
    >

      {/* ==================================================
          ITEM ID
      =================================================== */}

      <div
        className="
          mb-[8px]
          flex
          items-center
        "
      >
        <FieldLabel highlight>
          Item ID
        </FieldLabel>

        <div className="w-[310px]">
          <Select<Option, false>
            options={itemIdOptions}
            value={item.itemId}
            onChange={(
              option: SingleValue<Option>,
            ) =>
              updateItem(
                "itemId",
                option,
              )
            }
            styles={selectStyles}
            isClearable={false}
            isSearchable
            menuPosition="fixed"
            menuPortalTarget={
              typeof document !==
              "undefined"
                ? document.body
                : undefined
            }
            placeholder=""
            name="lkpItemID"
          />
        </div>

    
      </div>

      {/* ==================================================
          ITEM NAME
      =================================================== */}

      <div
        className="
          mb-[8px]
          flex
          items-center
        "
      >
        <FieldLabel highlight>
          Item Name
        </FieldLabel>

        <div className="flex-1">
          <Select<Option, false>
            options={itemNameOptions}
            value={item.itemName}
            onChange={(
              option: SingleValue<Option>,
            ) =>
              updateItem(
                "itemName",
                option,
              )
            }
            styles={selectStyles}
            isClearable={false}
            isSearchable
            menuPosition="fixed"
            menuPortalTarget={
              typeof document !==
              "undefined"
                ? document.body
                : undefined
            }
            placeholder=""
            name="lkpItemName"
          />
        </div>

     
      </div>

      {/* ==================================================
          DESCRIPTION
      =================================================== */}

      <div
        className="
          mb-[8px]
          flex
          items-center
        "
      >
        <FieldLabel>
          Description
        </FieldLabel>

        <div className="flex-1">
          <Select<Option, false>
            options={descriptionOptions}
            value={item.description}
            onChange={(
              option: SingleValue<Option>,
            ) =>
              updateItem(
                "description",
                option,
              )
            }
            styles={selectStyles}
            isClearable={false}
            isSearchable
            menuPosition="fixed"
            menuPortalTarget={
              typeof document !==
              "undefined"
                ? document.body
                : undefined
            }
            placeholder=""
            name="lkpDescription"
          />
        </div>

       
      </div>

      {/* ==================================================
          UNIT
      =================================================== */}

      <div
        className="
          mb-[8px]
          flex
          items-center
        "
      >
        <FieldLabel>
          Unit
        </FieldLabel>

        <input
          type="text"
          value={item.unit}
          onChange={(event) =>
            updateItem(
              "unit",
              event.target.value,
            )
          }
          className="
          
            w-[159px]
          
            input-style
          "
          name="txtUnit"
        />

      
      </div>

      {/* ==================================================
          ITEM GROUP
      =================================================== */}
<div
  className="
    mb-[8px]
    flex
    items-center
  "
>
  <FieldLabel highlight>
    Item Group
  </FieldLabel>

  <div className="flex w-full items-center gap-[20px]">
    <div>
      <input
        type="text"
        value={item.itemGroupId}
        onChange={(event) =>
          updateItem(
            "itemGroupId",
            event.target.value,
          )
        }
        className="
          w-[159px]
          input-style
        "
        name="txtItemGroupID"
      />
    </div>

    <div className="flex-1">
      <input
        type="text"
        value={item.itemGroupName}
        onChange={(event) =>
          updateItem(
            "itemGroupName",
            event.target.value,
          )
        }
        className="
          w-full
          input-style
        "
        name="txtItemGroupName"
      />
    </div>
  </div>
</div>
      {/* ==================================================
          SUPPLIER
      =================================================== */}

      <div
        className="
          mb-[8px]
          flex
          items-center
        "
      >
        <FieldLabel>
          Supplier
        </FieldLabel>

        <div className="flex w-full items-center gap-[20px]">
 
          <div>
            <input
              type="text"
              value={item.supplierId}
              onChange={(event) =>
                updateItem(
                  "supplierId",
                  event.target.value,
                )
              }
              className="
              
                w-[159px]
              input-style
              "
              name="txtSupplierID"
            />

          
          </div>

          <div className="flex-1">
            <input
              type="text"
              value={item.supplierName}
              onChange={(event) =>
                updateItem(
                  "supplierName",
                  event.target.value,
                )
              }
              className="
                
                w-full
                input-style
                
              "
              name="txtSupplierName"
            />

          </div>

        </div>
      </div>

      {/* ==================================================
          SUPPLIER ITEM ID
      =================================================== */}

      <div
        className="
          mb-[10px]
          flex
          items-center
        "
      >
        <FieldLabel>
          Supplier Item ID
        </FieldLabel>

        <div>
          <input
            type="text"
            value={item.supplierItemId}
            onChange={(event) =>
              updateItem(
                "supplierItemId",
                event.target.value,
              )
            }
            className="
             
              w-[329px]
              
              input-style
            "
            name="txtSupplierItemID"
          />

          
        </div>
      </div>

    </div>
  );
};

export default ItemEnquiryHeader;