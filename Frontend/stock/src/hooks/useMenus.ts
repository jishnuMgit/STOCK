import { useCallback, useEffect, useState } from "react";
import type { MenuRow } from "../types/menu";

const API_URL = import.meta.env.VITE_API_URL;

interface MenuResponse {
  success: boolean;
  message?: string;
  data?: MenuRow[];
}

/* =========================================================
   PURE FETCH (NO setState)

   Kept separate from the hook's state so the mount effect
   below never calls setState synchronously in its own body
   — every state update happens inside a .then()/.catch(),
   which is the pattern React's "no setState in effect body"
   lint rule expects for data fetching.
========================================================= */

async function fetchMenuRows(): Promise<MenuRow[]> {
  const companyId = localStorage.getItem("companyId");

  if (!companyId) {
    throw new Error("Company ID not found. Please log in again.");
  }

  // userId / userType are read server-side from the
  // authenticated session (req.user), not sent here.
  const response = await fetch(
    `${API_URL}/menu?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  const data: MenuResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load menus");
  }

  return data.data ?? [];
}

export const useMenus = () => {
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true); // true by default: we always fetch on mount
  const [error, setError] = useState("");

  /* =====================================================
     REFETCH (for a manual "Retry" button, etc.)

     Called from an event handler, not an effect, so a
     synchronous setLoading(true) here is fine — the lint
     rule only concerns setState calls inside an effect's
     own body.
  ===================================================== */

  const refetch = useCallback(() => {
    setLoading(true);
    setError("");

    return fetchMenuRows()
      .then((rows) => {
        setMenus(rows);
      })
      .catch((err: unknown) => {
        console.error("Get menus error:", err);
        setError(err instanceof Error ? err.message : "Failed to load menus");
        setMenus([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /* =====================================================
     FETCH ON MOUNT

     No setState call is made synchronously in the effect
     body — `loading` already starts `true`, and every
     update below runs inside a .then()/.catch()/.finally()
     callback once the fetch resolves.
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    fetchMenuRows()
      .then((rows) => {
        if (!cancelled) {
          setMenus(rows);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error("Get menus error:", err);
          setError(err instanceof Error ? err.message : "Failed to load menus");
          setMenus([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { menus, loading, error, refetch };
};
