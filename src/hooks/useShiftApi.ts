"use client";
import { useState } from "react";

export function useShiftApi() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function shiftAction(
    shiftId: string,
    action: "claim" | "confirm" | "decline",
    extra?: Record<string, unknown>,
  ): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
    setLoading(shiftId);
    setError(null);
    try {
      const res = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Er ging iets mis. Probeer opnieuw.");
        return { ok: false };
      }
      const body = await res.json().catch(() => ({}));
      return { ok: true, data: body.data };
    } finally {
      setLoading(null);
    }
  }

  return { loading, error, setError, shiftAction };
}
