"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { parseCsv, STATUSES, toCsv, useProspects } from "@/lib/store";
import { useToast } from "@/components/Shell";

export default function Prospects() {
  const toast = useToast();
  const { prospects, ready, remove, merge } = useProspects();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const file = useRef<HTMLInputElement>(null);
  const shown = prospects.filter((p) => p.companyName.toLowerCase().includes(q.toLowerCase()) && (status === "All" || p.status === status));

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(prospects)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "leadscout-prospects.csv"; a.click(); URL.revokeObjectURL(url);
  }
  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    try {
      if (f.size > 1_000_000) throw new Error("CSV file is too large (max 1 MB).");
      const items = parseCsv(await f.text()); merge(items); toast(`Imported ${items.length} prospects`);
    } catch (err) { toast(err instanceof Error ? err.message : "Import failed", "error"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-slate-900">Saved Prospects</h1>
          <p className="text-sm text-slate-500">Saved in this browser only (localStorage). Not synced across devices; export a CSV to back up.</p></div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => file.current?.click()}><Upload size={16} /> Import CSV</button>
          <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} aria-label="Import CSV file" />
          <button className="btn" onClick={exportCsv} disabled={!prospects.length}><Download size={16} /> Export CSV</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[12rem] flex-1"><label className="label" htmlFor="q">Search company</label><input id="q" className="input" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div><label className="label" htmlFor="st">Status</label>
          <select id="st" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>{["All", ...STATUSES].map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="card overflow-x-auto">
        {ready && shown.length === 0 ? (
          <p className="py-8 text-center text-slate-500">{prospects.length ? "No prospects match your filters." : "No saved prospects yet. Research a company and save it here."}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2 pr-4">Company</th><th className="pr-4">Website</th><th className="pr-4">Service</th><th className="pr-4">Status</th><th className="pr-4">Added</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4"><Link className="font-medium text-indigo-700 hover:underline" href={`/prospects/${p.id}`}>{p.companyName}</Link></td>
                  <td className="pr-4">{p.website || "–"}</td><td className="pr-4">{p.targetService || "–"}</td>
                  <td className="pr-4"><span className="badge">{p.status}</span></td><td className="pr-4">{new Date(p.dateAdded).toLocaleDateString()}</td>
                  <td><button className="btn" aria-label={`Delete ${p.companyName}`} onClick={() => { if (confirm(`Delete ${p.companyName}?`)) { remove(p.id); toast("Prospect deleted"); } }}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
