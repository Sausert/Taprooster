"use client";
import { useState, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/types";

// ── Context ──
const AppContext = createContext<{
  profile: Profile | null;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}>({ profile: null, unreadCount: 0, setUnreadCount: () => {} });

export const useApp = () => useContext(AppContext);

// ── SVG Icons ──
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L4.09 12.96A1 1 0 005 14.5h6.5L11 22l8.91-10.96A1 1 0 0019 9.5h-6.5L13 2z"/>
  </svg>
);
const IconRooster = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconAccount = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconAdmin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

// ── Bottom Nav ──
const NAV_ITEMS_BASE = [
  { path: "/dashboard", icon: <IconDashboard />, label: "Home" },
  { path: "/rooster",   icon: <IconRooster />,   label: "Rooster" },
  { path: "/account",  icon: <IconAccount />,   label: "Account" },
];
const NAV_ITEM_ADMIN = { path: "/admin", icon: <IconAdmin />, label: "Admin" };

export default function AppShell({
  children,
  profile,
  unreadCount: initialUnread,
}: {
  children: React.ReactNode;
  profile: Profile | null;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnread);

  const isAdmin = profile?.role === "admin";
  const NAV_ITEMS = isAdmin ? [...NAV_ITEMS_BASE, NAV_ITEM_ADMIN] : NAV_ITEMS_BASE;
  const currentLabel = NAV_ITEMS.find(n => pathname.startsWith(n.path))?.label || "";

  return (
    <AppContext.Provider value={{ profile, unreadCount, setUnreadCount }}>
      <div style={s.root}>
        {/* Top bar */}
        <header style={s.topBar}>
          <div style={s.logo}>
            Taprooster
          </div>
          <div style={s.pageLabel}>{currentLabel.toUpperCase()}</div>
          <button
            style={s.notifBtn}
            onClick={() => router.push("/account?tab=notif")}
          >
            🔔
            {unreadCount > 0 && <span style={s.notifDot} />}
          </button>
        </header>

        {/* Page content */}
        <main style={s.main}>{children}</main>

        {/* Bottom nav */}
        <nav style={s.bottomNav}>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                style={s.navItem}
                onClick={() => router.push(item.path)}
              >
                {active && <div style={s.navBar} />}
                <span style={{ display:"flex", alignItems:"center", justifyContent:"center", color: active ? "#00e5c3" : "#8b80b0", filter: active ? "drop-shadow(0 0 6px #00e5c3)" : "none", transition:"filter 0.2s" }}>
                  {item.icon}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 900 : 600,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: active ? "#00e5c3" : "#8b80b0",
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </AppContext.Provider>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    maxWidth: 430,
    margin: "0 auto",
    minHeight: "100vh",
    background: "#0f0d1a",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(15,13,26,0.92)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid #2e2a4a",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontFamily: "'Exo 2', sans-serif",
    fontWeight: 900,
    fontSize: 18,
    color: "#00e5c3",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  pageLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: "#8b80b0",
  },
  notifBtn: {
    width: 36,
    height: 36,
    background: "#1a1730",
    border: "1px solid #2e2a4a",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    fontSize: 16,
  },
  notifDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    background: "#ff4f6d",
    borderRadius: "50%",
    border: "2px solid #0f0d1a",
  },
  main: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: 80,
  },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    background: "rgba(15,13,26,0.96)",
    backdropFilter: "blur(20px)",
    borderTop: "1px solid #2e2a4a",
    display: "flex",
    zIndex: 50,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  navItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 0 8px",
    cursor: "pointer",
    background: "none",
    border: "none",
    gap: 3,
    position: "relative",
  },
  navBar: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: 24,
    height: 2,
    background: "#00e5c3",
    borderRadius: "0 0 2px 2px",
    boxShadow: "0 0 8px #00e5c3",
  },
};
