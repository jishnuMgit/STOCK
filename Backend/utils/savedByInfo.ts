// "<user>  dd/mm/yyyy hh:mm" - the user who saved a document and the time it was saved ("" when the document has neither).
// The "Saved By" line at the bottom right of the print of a stock document (Stock Transfer, Stock Adjustment, Beginning Stock).
export const savedByInfo = (
  userId: string | null | undefined,
  savedAt: string | Date | null | undefined,
): string => {
  const who = String(userId ?? "").trim();
  const when = savedAt ? new Date(savedAt) : null;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const time =
    when && !Number.isNaN(when.getTime())
      ? `${pad2(when.getDate())}/${pad2(when.getMonth() + 1)}/${when.getFullYear()} ${pad2(when.getHours())}:${pad2(when.getMinutes())}`
      : "";

  return [who, time].filter(Boolean).join("  ");
};
