import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-server";

function initWebPush() {
  const missing = [
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    !process.env.VAPID_PRIVATE_KEY && "VAPID_PRIVATE_KEY",
    !process.env.VAPID_EMAIL && "VAPID_EMAIL",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`[push] Web Push uitgeschakeld — ontbrekende env vars: ${missing.join(", ")}`);
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushSub { endpoint: string; p256dh: string; auth: string; }

async function dispatchPush(sub: PushSub, payload: PushPayload): Promise<{ expired: boolean }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return { expired: false };
  } catch (err) {
    const e = err as { statusCode?: number; body?: string };
    const status = e.statusCode;
    const expired = status === 410 || status === 404;
    if (!expired) {
      // 401/403 = VAPID-keys matchen niet of zijn ongeldig; iets anders = onverwacht
      console.error(`[push] aflevering mislukt (status ${status ?? "?"}): ${e.body ?? (err as Error).message}`);
    }
    return { expired };
  }
}

async function pruneExpired(endpoints: string[]) {
  if (!endpoints.length) return;
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().in("endpoint", endpoints);
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!initWebPush()) return;
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  if (!subs?.length) return;
  const results = await Promise.all(subs.map(s => dispatchPush(s, payload)));
  await pruneExpired(subs.filter((_, i) => results[i].expired).map(s => s.endpoint));
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!initWebPush()) return;
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", userIds);
  if (!subs?.length) return;
  const results = await Promise.all(subs.map(s => dispatchPush(s, payload)));
  await pruneExpired(subs.filter((_, i) => results[i].expired).map(s => s.endpoint));
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!initWebPush()) return;
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) return;
  const results = await Promise.all(subs.map(s => dispatchPush(s, payload)));
  await pruneExpired(subs.filter((_, i) => results[i].expired).map(s => s.endpoint));
}
