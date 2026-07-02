import { useCallback, useEffect, useState } from "react";

import { applyWaDashboardCatalogAction, getWaDashboardCatalog } from "./dashboard-client";
import type { DashboardCatalogAction, WaDashboardData } from "./dashboard-store.server";

export function useWaDashboardData() {
  const [data, setData] = useState<WaDashboardData>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getWaDashboardCatalog());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyAction = useCallback(async (action: DashboardCatalogAction, success = "Saved.") => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const nextData = await applyWaDashboardCatalogAction(action);
      setData(nextData);
      setNotice(success);
      return nextData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save changes.";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    data,
    loading,
    saving,
    error,
    notice,
    setError,
    setNotice,
    reload,
    applyAction,
  };
}

export function formatMoney(value: number | string, currency = "USD") {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number.isFinite(amount) ? amount : 0);
}
