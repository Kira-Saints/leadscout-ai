"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Copy, Save, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { STATUSES, Status, useProspects } from "@/lib/store";
import { useToast } from "@/components/Shell";

export default function ProspectDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { prospects, ready, update, remove } = useProspects();
  const p = prospects.find((x) => x.id === id);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("New");
  const [aiAvailable, setAiAvailable] = useState(false);
  useEffect(() => { if (p) { setSubject(p.emailSubject); setBody(p.emailBody); setStatus(p.status); } }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api<{ ai_available: boolean }>("/api/health").then((h) => setAiAvailable(h.ai_available)).catch(() => {}); }, []);

  if (!ready) return null;
  if (!p) return <div className="card"><p>Prospect not found. It may exist only in another browser.</p><Link href="/prospects" className="btn mt-3">Back to prospects</Link></div>;

  async function regenerate(useAi: boolean) {
    if (!p) return;
    try {
      const r = await api<{ subject: string; body: string }>("/api/generate-outreach", { company_name: p.companyName, website_url: p.website, target_service: p.targetService || null, summary: p.summary, use_ai: useAi });
      setSubject(r.subject); setBody(r.body); toast("Draft regenerated (not saved yet)");
    } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); toast("Copied to clipboard"); } catch { toast("Could not copy", "error"); }
  }

  return (
    <div className="space-y-6">
      <Link href="/prospects" className="text-sm text-indigo-700 hover:underline">← Saved prospects</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{p.companyName}</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="stat" className="sr-only">Status</label>
          <select id="stat" className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as Status)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn" aria-label="Delete prospect" onClick={() => { if (confirm(`Delete ${p.companyName}?`)) { remove(p.id); router.push("/prospects"); } }}><Trash2 size={16} /></button>
        </div>
      </div>
      <section className="card space-y-2 text-sm">
        <p><b>Website:</b> {p.website || "–"}</p><p><b>Target service:</b> {p.targetService || "–"}</p>
        <p><b>Added:</b> {new Date(p.dateAdded).toLocaleString()}</p><p><b>Summary:</b> {p.summary || "–"}</p>
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold text-slate-900">Outreach draft</h2>
        <div><label className="label" htmlFor="sub">Subject</label><input id="sub" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div><label className="label" htmlFor="bod">Message</label><textarea id="bod" rows={10} className="input" value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => { update(p.id, { emailSubject: subject, emailBody: body, status }); toast("Saved"); }}><Save size={16} /> Save changes</button>
          <button className="btn" onClick={copy}><Copy size={16} /> Copy</button>
          <button className="btn" disabled={!aiAvailable} onClick={() => regenerate(true)}><Sparkles size={16} /> Regenerate with AI</button>
          <button className="btn" onClick={() => regenerate(false)}>Use template</button>
        </div>
      </section>
    </div>
  );
}
