"use client";
import Link from "next/link";
import { useProspects } from "@/lib/store";
import { Search } from "lucide-react";

export default function Dashboard() {
  const { prospects, ready } = useProspects();
  const count = (s: string) => prospects.filter((p) => p.status === s).length;
  const cards = [["Total prospects", prospects.length], ["New", count("New")], ["Researched", count("Researched")], ["Contacted", count("Contacted")]];
  const recent = [...prospects].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 5);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Your prospects are stored in this browser only.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([label, n]) => (
          <div key={label} className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold text-slate-900">{ready ? n : "–"}</p></div>
        ))}
      </div>
      <section className="card">
        <h2 className="mb-3 font-semibold text-slate-900">Recent research activity</h2>
        {ready && recent.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-500">No prospects yet. Research your first company to get started.</p>
            <Link href="/research" className="btn btn-primary mt-4"><Search size={16} /> Research a company</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500"><tr><th className="py-2 pr-4">Company</th><th className="pr-4">Service</th><th className="pr-4">Status</th><th>Added</th></tr></thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4"><Link className="font-medium text-indigo-700 hover:underline" href={`/prospects/${p.id}`}>{p.companyName}</Link></td>
                    <td className="pr-4">{p.targetService || "–"}</td><td className="pr-4"><span className="badge">{p.status}</span></td>
                    <td>{new Date(p.dateAdded).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
