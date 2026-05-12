"use client";
import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { Profile, Shift } from "@/types";

export type LeaderboardEntry = Profile & { taps_this_year: number; target: number };

export interface AdminShellContextValue {
  // Data
  shifts: Shift[];
  profiles: Profile[];
  leaderboard: LeaderboardEntry[];
  published: Shift[];
  conceptShifts: Shift[];

  // Setters
  setShifts: Dispatch<SetStateAction<Shift[]>>;
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  setPublished: Dispatch<SetStateAction<Shift[]>>;
  setConceptShifts: Dispatch<SetStateAction<Shift[]>>;

  // Shared date range (rooster tab + publish tab)
  dateFrom: string;
  dateTo: string;
  setDateFrom: Dispatch<SetStateAction<string>>;
  setDateTo: Dispatch<SetStateAction<string>>;

  // Add-tapper modal (opened from health tab and rooster tab)
  addTapperModal: Shift | null;
  setAddTapperModal: Dispatch<SetStateAction<Shift | null>>;
  tapperSearchModal: string;
  setTapperSearchModal: Dispatch<SetStateAction<string>>;
  addingTapper: string | null;

  // Shift inline editing (used by AdminShiftCard)
  editingShiftId: string | null;
  setEditingShiftId: Dispatch<SetStateAction<string | null>>;
  shiftEditError: string | null;
  setShiftEditError: Dispatch<SetStateAction<string | null>>;

  // Shared operations
  handleAddTapper: (shiftId: string, userId: string) => Promise<void>;
  handleRemoveTapper: (shiftId: string, userId: string) => Promise<void>;
  handleDeleteShift: (shiftId: string, source: "concept" | "published") => Promise<void>;
  saveShiftEdit: (shift: Shift & Record<string, unknown>) => Promise<void>;
  updateShiftInList: (
    id: string,
    field: string,
    value: unknown,
    list: Shift[],
    setList: Dispatch<SetStateAction<Shift[]>>,
  ) => void;
}

export const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function useAdminShell(): AdminShellContextValue {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error("useAdminShell must be used inside AdminClient");
  return ctx;
}
