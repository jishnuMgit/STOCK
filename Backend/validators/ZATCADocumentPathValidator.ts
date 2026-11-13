/* the old ValidateMe of frmZATCAFilePath; returns the message, or null */
export const validateZATCAFilePath = (filePath: unknown): string | null => {
  const s = typeof filePath === "string" ? filePath.trim() : "";
  if (!s) return "Please Select 'File Path'";
  if (s.length > 50) return "'File Path' cannot exceed 50 characters";
  return null;
};
