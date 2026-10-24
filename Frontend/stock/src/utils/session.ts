export const SESSION_KEYS = {
  coId: "PstrCoID",
  year: "PstrYear",
  userId: "PstrUserID",
} as const;

export const getSession = () => ({
  pstrCoID: localStorage.getItem(SESSION_KEYS.coId) ?? "",
  pstrYear: localStorage.getItem(SESSION_KEYS.year) ?? "",
  pstrUserID: localStorage.getItem(SESSION_KEYS.userId) ?? "",
});

/* Drop-in replacement for fetch() that adds company/year/user headers. */
export const apiFetch = (
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> => {
  const { pstrCoID, pstrYear, pstrUserID } = getSession();

  const headers = new Headers(init.headers);

  headers.set("x-co-id", pstrCoID);
  headers.set("x-year", pstrYear);
  headers.set("x-user-id", pstrUserID);

  return fetch(input, { ...init, headers, credentials: "include" });
};
