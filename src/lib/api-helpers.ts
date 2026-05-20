// API route helpers — eliminate repeated auth boilerplate across 11 routes.
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "./supabase-server";

type AuthResult =
  | { error: NextResponse }
  | { user: { id: string }; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> };

type AdminResult =
  | { error: NextResponse }
  | { user: { id: string }; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; profile: { role: string } };

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user, supabase };
}

export async function requireAdmin(): Promise<AdminResult> {
  const result = await requireAuth();
  if ("error" in result) return result;
  const { user, supabase } = result;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user, supabase, profile };
}

export function parseJsonBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  return req.json().catch(() => null);
}
