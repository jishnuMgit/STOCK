// fileName.ts
// The names of the files a page downloads (Excel / PDF), made the same way everywhere: words and a date a person understands,
//   "Beginning Stock Jeddah 13-Nov-2026 131621"
// and not an ID with a number (BeginningStock_JD_20261120_131621).

// a piece of text that is safe in a file name: the characters Windows does not allow are dropped, spaces are kept single
export const fileNamePart = (value: unknown): string =>
  String(value ?? "")
    .replace(/[\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// "2026-11-13" -> "13-Nov-2026" (a date that is not valid gives "")
export const fileNameDate = (yyyyMmDd: string | null | undefined): string => {
  const text = String(yyyyMmDd ?? "").slice(0, 10);
  const date = new Date(`${text}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime())) return "";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(date.getDate()).padStart(2, "0")}-${months[date.getMonth()]}-${date.getFullYear()}`;
};

// the time of the download, "131621": a file of the same name that is still open (Excel locks it) never stops the download
export const fileNameTime = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// "Beginning Stock Jeddah 13-Nov-2026 131621" - the parts that are empty are left out
export const buildFileName = (...parts: unknown[]): string =>
  parts
    .map(fileNamePart)
    .filter((part) => part !== "")
    .join(" ");
