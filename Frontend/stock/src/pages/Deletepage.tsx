import { useState } from "react";
import { apiFetch } from "../utils/session";

const API = import.meta.env.VITE_API_URL;

const postJson = async (url: string, body: unknown) => {
  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `HTTP Error: ${response.status}`);
  }
  return result;
};

const Deletepage = () => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "This will permanently delete all transactions. Are you sure?",
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await postJson(`${API}/transaction-delete`, {});
      alert(result.message);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete transactions",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <button className="btn-style" onClick={handleDelete} disabled={loading}>
        {loading ? "Deleting..." : "Delete Transaction"}
      </button>
    </div>
  );
};

export default Deletepage;
