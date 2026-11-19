// ============================================================
// THE SERVER DATE - the common helper (the same for every page)
//
// The time of a save / post comes from the DATABASE server's clock, never from the browser's: the page asks for it
// (GET /datetime/server-date, the common DateTime controller) and sends it with the request, as `dtpServerDate`:
//
//     const dtpServerDate = await getServerDate();
//     await fetch(`${api}/StockTransfer/saveStockTransfer`, { ..., body: JSON.stringify({ ..., dtpServerDate }) });
//
// The backend checks it (the format, and that it is close to its own clock) and writes it on every row of the
// transaction, so all the rows carry the same time. If the page sends none, or a wrong one, the backend uses its own.
// ============================================================

const api = import.meta.env.VITE_API_URL;

// "YYYY-MM-DD HH:mm:ss" - the time of the database server
export async function getServerDate(): Promise<string> {
  const response = await fetch(`${api}/datetime/server-date`, { credentials: "include" });
  const result = await response.json();

  if (!response.ok || !result.success || !result.data?.serverDate) {
    throw new Error(result.message || "Could not get the server date");
  }

  return String(result.data.serverDate);
}

// The same, but never fails: "" when the server date cannot be had (the backend then uses its own time), so a save is
// never stopped by it.
export async function tryGetServerDate(): Promise<string> {
  try {
    return await getServerDate();
  } catch (error: unknown) {
    console.error("getServerDate error:", error);
    return "";
  }
}
