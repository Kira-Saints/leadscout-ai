"use client";
import { useCallback, useEffect, useState } from "react";

export const STATUSES = ["New", "Researched", "Contacted", "Archived"] as const;
export type Status = (typeof STATUSES)[number];
export interface Prospect {
  id: string; companyName: string; website: string; targetService: string; summary: string;
  emailSubject: string; emailBody: string; status: Status; dateAdded: string;
}
const KEY = "leadscout.prospects.v1";

function load(): Prospect[] {
  try { const p = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
}
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export function useProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { setProspects(load()); setReady(true); }, []);
  const mutate = useCallback((fn: (p: Prospect[]) => Prospect[]) => {
    const next = fn(load());
    setProspects(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or disabled */ }
  }, []);
  const add = useCallback((p: Omit<Prospect, "id" | "dateAdded">) =>
    mutate((all) => [{ ...p, id: newId(), dateAdded: new Date().toISOString() }, ...all]), [mutate]);
  const update = useCallback((id: string, patch: Partial<Prospect>) =>
    mutate((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p))), [mutate]);
  const remove = useCallback((id: string) => mutate((all) => all.filter((p) => p.id !== id)), [mutate]);
  const merge = useCallback((items: Prospect[]) => mutate((all) => [...items, ...all]), [mutate]);
  const clear = useCallback(() => mutate(() => []), [mutate]);
  return { prospects, ready, add, update, remove, merge, clear };
}

// ---------- CSV ----------
const HEADERS = ["id", "companyName", "website", "targetService", "summary", "emailSubject", "emailBody", "status", "dateAdded"] as const;
const FORMULA = /^[=+\-@\t\r]/;

function esc(v: string): string {
  const s = FORMULA.test(v) ? "'" + v : v; // neutralise spreadsheet formulas
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(list: Prospect[]): string {
  const rows = list.map((p) => HEADERS.map((h) => esc(String(p[h] ?? ""))).join(","));
  return [HEADERS.join(","), ...rows].join("\r\n");
}
function parseRows(t: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ""; let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const unesc = (v: string) => (/^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v);
const cap = (v: string, n: number) => unesc(v).slice(0, n);

export function parseCsv(text: string): Prospect[] {
  if (text.length > 1_000_000) throw new Error("CSV file is too large (max 1 MB).");
  const rows = parseRows(text.replace(/^\uFEFF/, ""));
  if (!rows.length || HEADERS.some((h, i) => rows[0][i]?.trim() !== h)) throw new Error("Not a LeadScout CSV export (unexpected header).");
  if (rows.length > 501) throw new Error("Too many rows (max 500).");
  return rows.slice(1).map((r) => {
    const g = (h: (typeof HEADERS)[number]) => r[HEADERS.indexOf(h)] ?? "";
    const name = cap(g("companyName"), 120).trim();
    if (!name) throw new Error("A row is missing a company name.");
    let site = cap(g("website"), 2048).trim();
    try { const u = new URL(site); if (!/^https?:$/.test(u.protocol)) site = ""; } catch { site = ""; }
    const status = (STATUSES as readonly string[]).includes(g("status")) ? (g("status") as Status) : "New";
    const d = new Date(g("dateAdded"));
    return {
      id: newId(), companyName: name, website: site, targetService: cap(g("targetService"), 120),
      summary: cap(g("summary"), 4000), emailSubject: cap(g("emailSubject"), 300), emailBody: cap(g("emailBody"), 8000),
      status, dateAdded: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(),
    };
  });
}
