/* =========================================================
   COMMON TYPES
========================================================= */

export interface SelectOption {
  value: string;
  label: string;
}

export interface Branch {
  fbrid: string;
  fbrname: string;
}

export interface FinancialParameter {
  fptype: string;
  fpid: string;
  fpname: string;
  fpositionno: number;
}

export interface CostCenter {
  fccid: string;
  fccname: string;
  fpositionno: number;
}

export interface AccountData {
  fcoid: string;
  faccountid: string;
  faccountgroupid?: string;
  fgph: string;
  fgcs: string;
  faccountname: string;
  fhavecc: boolean;
}

export interface ReceiptRow {
  id: number;

  accountId: string;
  accountName: string;

  fgcs: string;

  haveCc: boolean;

  hasDivision: boolean;

  division: string;

  ccId: string;

  creditAmount: string;

  match: boolean;

  description?: string;
}

export interface CustomerDivision {
  fdivid: string;
  fdivname: string;
}

/* =========================================================
   TABLE FIELD TYPES
========================================================= */

export type TableField =
  | "accountId"
  | "accountName"
  | "division"
  | "ccId"
  | "creditAmount"
  | "match"
  | "view";

export type SortField =
  | "accountId"
  | "accountName";

/* =========================================================
   ACCOUNT OPTION
========================================================= */

export interface AccountOption {
  value: string;
  label: string;

  accountId: string;
  accountName: string;

  fgcs: string;

  haveCc: boolean;
}

/* =========================================================
   ROW REF TYPES
========================================================= */

export type RowRefValue =
  | HTMLElement
  | SelectInstance<any>
  | null;

export type RowRefs = Partial<
  Record<TableField, HTMLElement>
>;

/* =========================================================
   RECEIPT TABLE REF
========================================================= */

export interface ReceiptTableRef {
  focusFirstAccountId: () => void;

  focusField: (
    rowIndex: number,
    field: TableField
  ) => void;
}

/* =========================================================
   RECEIPT TABLE PROPS
========================================================= */

export interface ReceiptTableProps {
  rows: ReceiptRow[];

  handleRowChange: (
    rowIndex: number,
    field: keyof ReceiptRow,
    value: string | number | boolean
  ) => void;

  onFieldEnter: (
    rowIndex: number,
    field: TableField
  ) => void;

  onTableEscape: () => void;

  onClearRow: (
    rowIndex: number
  ) => void;

  onSortRows: (
    field: SortField,
    direction: "asc" | "desc"
  ) => void;

  accountOptions?: AccountData[];

  accountSortByIdOptions?: AccountData[];

  costCenters?: CostCenter[];
}
export const ReceiptTable =
  forwardRef<
    ReceiptTableRef,
    ReceiptTableProps
  >(
    (
      {
  rows,
  handleRowChange,
  onFieldEnter,
  onTableEscape,
  onClearRow,
  onSortRows,
  accountOptions = [],
  accountSortByIdOptions = [],
  costCenters = [],
},
      ref
    ) => {
      const [
        selectedRowId,
        setSelectedRowIdState,
      ] = useState<number | null>(null);

      const [
        sortField,
        setSortField,
      ] = useState<SortField | null>(null);

      const [
        sortDirection,
        setSortDirection,
      ] = useState<"asc" | "desc">("asc");

      const handleSort =
        useCallback(
          (
            field: SortField
          ) => {
            const nextDirection =
              sortField === field &&
              sortDirection === "asc"
                ? "desc"
                : "asc";

            setSortField(field);
            setSortDirection(
              nextDirection
            );

            onSortRows(
              field,
              nextDirection
            );
          },
          [
            onSortRows,
            sortDirection,
            sortField,
          ]
        );

      const rowRefs =
        useRef<RowRefs[]>([]);

      const setSelectedRowId =
        useCallback(
          (id: number) => {
            setSelectedRowIdState(id);
          },
          []
        );

      const setRowRef =
        useCallback(
          (
            rowIndex: number,
            field: TableField,
            value: RowRefValue
          ) => {
            if (
              !rowRefs.current[rowIndex]
            ) {
              rowRefs.current[rowIndex] =
                {};
            }

            if (value) {
              rowRefs.current[rowIndex][field] =
                value;
            } else {
              delete rowRefs.current[rowIndex][field];
            }
          },
          []
        );

      const realAccountOptions =
        useMemo<AccountOption[]>(
          () => {
            if (!Array.isArray(accountOptions)) {
              return [];
            }

            return accountOptions
              .filter(
                (account) =>
                  Boolean(
                    account &&
                    account.faccountid
                  )
              )
              .map(
                (account) => ({
                  value:
                    account.faccountid,

                  label:
                    account.faccountid,

                  accountId:
                    account.faccountid,

                  accountName:
                    account.faccountname ||
                    "",

                  fgcs:
                    account.fgcs ||
                    "",

                  haveCc:
                    account.fhavecc ===
                    true,
                })
              );
          },
          [accountOptions]
        );

        const accountIdOptions =
  useMemo<AccountOption[]>(() => {
    if (!Array.isArray(accountSortByIdOptions)) {
      return [];
    }

    return accountSortByIdOptions
      .filter(
        (account) =>
          Boolean(
            account &&
            account.faccountid
          )
      )
      .map(
        (account) => ({
          value: account.faccountid,
          label: account.faccountid,

          accountId:
            account.faccountid,

          accountName:
            account.faccountname || "",

          fgcs:
            account.fgcs || "",

          haveCc:
            account.fhavecc === true,
        })
      );
  }, [accountSortByIdOptions]);

      const ccIdOptions =
        useMemo<SelectOption[]>(
          () => {
            if (
              !Array.isArray(
                costCenters
              )
            ) {
              return [];
            }

            return [...costCenters]
              .sort(
                (first, second) =>
                  first.fpositionno -
                  second.fpositionno
              )
              .map(
                (costCenter) => ({
                  value:
                    costCenter.fccid,

                  label:
                    costCenter.fccid,
                })
              );
          },
          [costCenters]
        );

      const focusField =
        useCallback(
          (
            rowIndex: number,
            field: TableField
          ) => {
            const element =
              rowRefs.current[rowIndex]?.[field];

            if (!element) {
              console.warn(
                "ReceiptTable field not found:",
                rowIndex,
                field
              );

              return;
            }

            requestAnimationFrame(() => {
              element.focus();

              if (
                element instanceof
                HTMLInputElement
              ) {
                if (
                  element.type !==
                  "checkbox"
                ) {
                  element.select();
                }
              }
            });
          },
          []
        );

      useImperativeHandle(
        ref,
        () => ({
          focusFirstAccountId: () => {
            focusField(
              0,
              "accountId"
            );
          },

          focusField,
        }),
        [focusField]
      );

      return (
        <div className="receipt-table-wrapper">
          <table
            id="tblReceipt"
            className="receipt-table"
          >
            <colgroup>
              <col style={{ width: "38px" }} />
              <col style={{ width: "105px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "75px" }} />
              <col style={{ width: "75px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "60px" }} />
              <col style={{ width: "60px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Sl.</th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "accountId"
                      )
                    }
                  >
                    Account ID
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "accountName"
                      )
                    }
                  >
                    Account Name
                  </button>
                </th>

                <th>Division</th>

                <th>CC. ID</th>

                <th className="text-right">
                  Credit Amt.
                </th>

                <th className="text-center">
                  Match
                </th>

                <th className="text-center">
                  View
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row, index) => (
                  <ReceiptRow
                    key={row.id}
                    url=""
                    row={row}
                    index={index}
                    isSelected={
                      selectedRowId ===
                      row.id
                    }
                    realAccountOptions={
                      realAccountOptions
                    }
                    accountIdOptions={
                      accountIdOptions
                    }
                    ccIdOptions={
                      ccIdOptions
                    }
                    setSelectedRowId={
                      setSelectedRowId
                    }
                    setRowRef={
                      setRowRef
                    }
                    handleRowChange={
                      handleRowChange
                    }
                    onFieldEnter={
                      onFieldEnter
                    }
                    onTableEscape={
                      onTableEscape
                    }
                    onClearRow={
                      onClearRow
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      );
    }
  );

ReceiptTable.displayName =
  "ReceiptTable";
