import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { toLocalDateStr, addDays } from "@/lib/dates";

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockEmail = {
  sendShiftReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendUnconfirmedReminderEmail: vi.fn().mockResolvedValue(undefined),
};
const mockPush = {
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/email", () => mockEmail);
vi.mock("@/lib/push", () => mockPush);

// In-memory "database": shifts met assignments, plus notification log
let dbShifts: Array<{
  id: string; title: string; date: string; status: string;
  start_time: string; end_time: string;
  assignments: Array<{ user_id: string; status: string; profile: { email: string; full_name: string } | null }>;
}> = [];
let insertedNotifications: Array<Record<string, unknown>> = [];
// Pre-existing notifications (om alreadySent-dedupe te testen)
let existingNotifications: Array<{ user_id: string; type: string; shift_id: string; created_at: string }> = [];

function makeShiftsQuery() {
  const filters: { status?: string; date?: string; dates?: string[] } = {};
  const query = {
    select: () => query,
    eq: (col: string, val: string) => {
      if (col === "status") filters.status = val;
      if (col === "date") filters.date = val;
      return query;
    },
    in: (col: string, vals: string[]) => {
      if (col === "date") filters.dates = vals;
      return query;
    },
    then: (resolve: (v: { data: unknown }) => void) => {
      const data = dbShifts.filter(s =>
        (!filters.status || s.status === filters.status) &&
        (!filters.date || s.date === filters.date) &&
        (!filters.dates || filters.dates.includes(s.date))
      );
      resolve({ data });
    },
  };
  return query;
}

function makeNotificationsQuery() {
  const filters: Record<string, string> = {};
  const query = {
    select: () => query,
    eq: (col: string, val: string) => { filters[col] = val; return query; },
    gte: () => ({
      then: (resolve: (v: { count: number }) => void) => {
        const count = existingNotifications.filter(n =>
          n.user_id === filters.user_id && n.type === filters.type && n.shift_id === filters.shift_id
        ).length;
        resolve({ count });
      },
    }),
    insert: (row: Record<string, unknown>) => {
      insertedNotifications.push(row);
      return Promise.resolve({ error: null });
    },
  };
  return query;
}

vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => ({
    from: (table: string) => table === "shifts" ? makeShiftsQuery() : makeNotificationsQuery(),
  }),
}));

// Route ná de mocks importeren
const { GET } = await import("../route");

// ── Helpers ────────────────────────────────────────────────────────────────
const SECRET = "test-secret-xyz";

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/reminders", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

function shiftOn(daysFromNow: number, assignments: Array<{ user_id: string; status: string; email?: string | null }>, id = `shift-${daysFromNow}`) {
  return {
    id, title: `Tapavond +${daysFromNow}d`, date: toLocalDateStr(addDays(new Date(), daysFromNow)),
    status: "published", start_time: "20:00", end_time: "00:00",
    assignments: assignments.map(a => ({
      user_id: a.user_id, status: a.status,
      profile: a.email === null ? null : { email: a.email ?? `${a.user_id}@test.nl`, full_name: a.user_id },
    })),
  };
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  dbShifts = [];
  insertedNotifications = [];
  existingNotifications = [];
  vi.clearAllMocks();
});
afterEach(() => { delete process.env.CRON_SECRET; });

// ── Auth ───────────────────────────────────────────────────────────────────
describe("authenticatie", () => {
  it("weigert zonder Authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("weigert met verkeerde secret", async () => {
    const res = await GET(makeRequest("verkeerd"));
    expect(res.status).toBe(401);
  });

  it("weigert als CRON_SECRET niet gezet is (geen bypass)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("wat-dan-ook"));
    expect(res.status).toBe(401);
  });

  it("accepteert correcte secret", async () => {
    const res = await GET(makeRequest(SECRET));
    expect(res.status).toBe(200);
  });
});

// ── 2-weken en 1-week reminders ────────────────────────────────────────────
describe("reminder_2weeks en reminder_1week", () => {
  it("stuurt 2-weken reminder voor dienst op exact +14 dagen (assigned én confirmed)", async () => {
    dbShifts = [shiftOn(14, [
      { user_id: "anna", status: "confirmed" },
      { user_id: "bob", status: "assigned" },
      { user_id: "carl", status: "declined" },
    ])];
    const res = await GET(makeRequest(SECRET));
    const body = await res.json();

    const reminders = insertedNotifications.filter(n => n.type === "reminder_2weeks");
    expect(reminders.map(r => r.user_id).sort()).toEqual(["anna", "bob"]);
    expect(mockEmail.sendShiftReminderEmail).toHaveBeenCalledTimes(2);
    expect(mockPush.sendPushToUser).toHaveBeenCalledTimes(2 + 1); // +1: bob krijgt ook unconfirmed (dag 14)
    expect(body.sent).toBeGreaterThanOrEqual(2);
  });

  it("stuurt 1-week reminder voor dienst op exact +7 dagen", async () => {
    dbShifts = [shiftOn(7, [{ user_id: "anna", status: "confirmed" }])];
    await GET(makeRequest(SECRET));

    const reminders = insertedNotifications.filter(n => n.type === "reminder_1week");
    expect(reminders).toHaveLength(1);
    expect(reminders[0].user_id).toBe("anna");
    expect(mockEmail.sendShiftReminderEmail).toHaveBeenCalledWith(
      "anna@test.nl", "anna", expect.any(String), expect.any(String), expect.any(String), 1, "shift-7"
    );
  });

  it("stuurt GEEN reminder voor diensten op andere dagen (bijv. +10)", async () => {
    dbShifts = [shiftOn(10, [{ user_id: "anna", status: "confirmed" }])];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications).toHaveLength(0);
    expect(mockEmail.sendShiftReminderEmail).not.toHaveBeenCalled();
  });

  it("slaat declined tappers over", async () => {
    dbShifts = [shiftOn(14, [{ user_id: "carl", status: "declined" }])];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications).toHaveLength(0);
  });

  it("slaat tappers zonder e-mail over", async () => {
    dbShifts = [shiftOn(14, [{ user_id: "anna", status: "confirmed", email: null }])];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications.filter(n => n.type === "reminder_2weeks")).toHaveLength(0);
  });

  it("dedupliceert: geen tweede reminder als vandaag al verstuurd", async () => {
    dbShifts = [shiftOn(14, [{ user_id: "anna", status: "confirmed" }])];
    existingNotifications = [{ user_id: "anna", type: "reminder_2weeks", shift_id: "shift-14", created_at: new Date().toISOString() }];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications.filter(n => n.type === "reminder_2weeks")).toHaveLength(0);
    expect(mockEmail.sendShiftReminderEmail).not.toHaveBeenCalled();
  });

  it("negeert concept shifts", async () => {
    const concept = shiftOn(14, [{ user_id: "anna", status: "confirmed" }]);
    concept.status = "concept";
    dbShifts = [concept];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications).toHaveLength(0);
  });
});

// ── Onbevestigde diensten: alleen 14/7/3 dagen vooraf ──────────────────────
describe("unconfirmed_reminder op 14/7/3 dagen", () => {
  it.each([14, 7, 3])("stuurt bevestig-reminder voor onbevestigde dienst op +%i dagen", async (days) => {
    dbShifts = [shiftOn(days, [{ user_id: "bob", status: "assigned" }])];
    await GET(makeRequest(SECRET));

    const unconfirmed = insertedNotifications.filter(n => n.type === "unconfirmed_reminder");
    expect(unconfirmed).toHaveLength(1);
    expect(unconfirmed[0].user_id).toBe("bob");
    expect(mockEmail.sendUnconfirmedReminderEmail).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2, 5, 10, 20, 30])("stuurt GEEN bevestig-reminder op +%i dagen", async (days) => {
    dbShifts = [shiftOn(days, [{ user_id: "bob", status: "assigned" }])];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications.filter(n => n.type === "unconfirmed_reminder")).toHaveLength(0);
    expect(mockEmail.sendUnconfirmedReminderEmail).not.toHaveBeenCalled();
  });

  it("stuurt geen bevestig-reminder aan confirmed of declined tappers", async () => {
    dbShifts = [shiftOn(3, [
      { user_id: "anna", status: "confirmed" },
      { user_id: "carl", status: "declined" },
    ])];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications.filter(n => n.type === "unconfirmed_reminder")).toHaveLength(0);
  });

  it("dedupliceert bevestig-reminders binnen dezelfde dag", async () => {
    dbShifts = [shiftOn(3, [{ user_id: "bob", status: "assigned" }])];
    existingNotifications = [{ user_id: "bob", type: "unconfirmed_reminder", shift_id: "shift-3", created_at: new Date().toISOString() }];
    await GET(makeRequest(SECRET));
    expect(insertedNotifications.filter(n => n.type === "unconfirmed_reminder")).toHaveLength(0);
  });

  it("gebruikt de juiste e-mail (bevestig-mail, niet de week-reminder)", async () => {
    dbShifts = [shiftOn(3, [{ user_id: "bob", status: "assigned" }])];
    await GET(makeRequest(SECRET));
    expect(mockEmail.sendUnconfirmedReminderEmail).toHaveBeenCalledWith(
      "bob@test.nl", "bob", expect.any(String), expect.any(String), expect.any(String), "shift-3"
    );
    expect(mockEmail.sendShiftReminderEmail).not.toHaveBeenCalled();
  });
});

// ── Gecombineerd scenario ──────────────────────────────────────────────────
describe("gecombineerd scenario", () => {
  it("verwerkt meerdere diensten en types in één run correct", async () => {
    dbShifts = [
      shiftOn(14, [{ user_id: "anna", status: "confirmed" }], "s14"),
      shiftOn(7,  [{ user_id: "bob", status: "assigned" }], "s7"),
      shiftOn(3,  [{ user_id: "dave", status: "assigned" }], "s3"),
      shiftOn(5,  [{ user_id: "eva", status: "assigned" }], "s5"),   // geen reminder-dag
    ];
    const res = await GET(makeRequest(SECRET));
    const body = await res.json();

    expect(insertedNotifications.filter(n => n.type === "reminder_2weeks").map(n => n.user_id)).toEqual(["anna"]);
    expect(insertedNotifications.filter(n => n.type === "reminder_1week").map(n => n.user_id)).toEqual(["bob"]);
    // bob (+7, assigned) en dave (+3, assigned) krijgen bevestig-reminder; eva (+5) niet
    expect(insertedNotifications.filter(n => n.type === "unconfirmed_reminder").map(n => n.user_id).sort()).toEqual(["bob", "dave"]);
    expect(body.sent).toBe(4);
    expect(body.ok).toBe(true);
  });
});
