"use client";
import { useState } from "react";

// Shared hook for claim/confirm/decline API calls.
// Provides loading state per shift ID + error state.
// Each component handles its own optimistic state updates.
export function useShiftApi() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function shiftAction(
    shiftId: string,
    action: "claim" | "confirm" | "decline",
    extra?: Record<string, unknown>,
  ): Promise<boolean> {
    setLoading(shiftId);
    setError(null);
    try {
      const res = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Er ging iets mis. Probeer opnieuw.");
        return false;
      }
      return true;
    } finally {
      setLoading(null);
    }
  }

  return { loading, error, setError, shiftAction };
}
