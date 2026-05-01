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

// ── Bottom Nav ──
const NAV_ITEMS = [
  { path: "/dashboard", icon: "⚡", label: "Home" },
  { path: "/rooster",   icon: "📅", label: "Rooster" },
  { path: "/account",  icon: "👤", label: "Account" },
];

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
                <span style={{ fontSize: 20, color: active ? "#00e5c3" : "#8b80b0" }}>
                  {item.icon}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
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
    top: 6,
    right: 6,
    width: 8,
    height: 8,
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
