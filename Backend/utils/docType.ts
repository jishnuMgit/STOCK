export const GetStrDocType = (lkpType: unknown): string => {
  const type = String(lkpType ?? "")
    .trim()
    .toUpperCase();

  if (!type) {
    return "";
  }

  return type.length === 1 ? `${type}R` : type;
};
