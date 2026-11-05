const field = (row: Record<string, any>, name: string): unknown => {
  if (name in row) return row[name];
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key ? row[key] : undefined;
};

/* unique key of a document row returned by the search */
export const docKey = (row?: Record<string, any>): string =>
  row
    ? [
        field(row, "fYear"),
        field(row, "fBrID"),
        field(row, "fDocType"),
        field(row, "fDocNo"),
        field(row, "fSlNo"),
        field(row, "fSlNoSub"),
      ]
        .map((v) => String(v ?? ""))
        .join("|")
    : "";
