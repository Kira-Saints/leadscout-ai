"use client";
import { useEffect, useState } from "react";
import { Copy, Loader2, Save, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useProspects } from "@/lib/store";
import { useToast } from "@/components/Shell";

interface Profile { company_name: string; website_url: string; title: string; meta_description: string; headings: string[]; text_excerpt: string; summary: string; suggested_opportunities: string[]; limitations: string[] }
interface AI { summary: string; opportunities: { title: string; why: string }[]; email_subject: string; email_body: string }
interface Email { subject: string; body: string; source: "ai" | "template" }

export default function ResearchPage() {
  const toast = useToast();
  const { add } = useProspects();
  const [form, setForm] = useState({ name: "", url: "", service: "" });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ai, setAi] = useState<AI | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [busy, setBusy] = useState<"" | "research" | "ai" | "email">("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailSource, setEmailSource] = useState<"ai" | "template">("template");

  useEffect(() => { api<{ ai_available: boolean }>("/api/health").then((h) => setAiAvailable(h.ai_available)).catch(() => {}); }, []);
  const service = form.service.trim() || null;
  const fail = (e: unknown) => toast(e instanceof Error ? e.message : "Something went wrong", "error");

  async function draft(p: Profile, useAi: boolean, summary?: string) {
    setBusy("email");
    try {
      const r = await api<Email>("/api/generate-outreach", { company_name: p.company_name, website_url: p.website_url, target_service: service, summary: summary ?? p.summary, use_ai: useAi });
      setSubject(r.subject); setBody(r.body); setEmailSource(r.source);
    } catch (e) { fail(e); } finally { setBusy(""); }
  }
  async function research(e: React.FormEvent) {
    e.preventDefault(); setBusy("research"); setAi(null); setProfile(null);
    try {
      const p = await api<Profile>("/api/research", { company_name: form.name.trim(), website_url: form.url.trim(), target_service: service });
      setProfile(p); toast("Research complete");
      await draft(p, false);
    } catch (e) { fail(e); setBusy(""); }
  }
  async function analyze() {
    if (!profile) return; setBusy("ai");
    try {
      const r = await api<AI>("/api/ai-analysis", { company_name: profile.company_name, website_url: profile.website_url, target_service: service, title: profile.title, meta_description: profile.meta_description, headings: profile.headings, text_excerpt: profile.text_excerpt });
      setAi(r); setSubject(r.email_subject); setBody(r.email_body); setEmailSource("ai"); toast("AI analysis ready");
    } catch (e) { fail(e); } finally { setBusy(""); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); toast("Copied to clipboard"); } catch { toast("Could not copy", "error"); }
  }
  function save() {
    if (!profile) return;
    add({ companyName: profile.company_name, website: profile.website_url, targetService: service ?? "", summary: ai?.summary ?? profile.summary, emailSubject: subject, emailBody: body, status: "Researched" });
    toast("Saved to prospects");
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Research a Company</h1>
        <p className="text-sm text-slate-500">Reads the public homepage only. Results are suggestions to verify, not confirmed facts.</p></div>
      <form onSubmit={research} className="card grid gap-4 sm:grid-cols-3">
        <div><label className="label" htmlFor="n">Company name</label><input id="n" required maxLength={120} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="u">Website URL</label><input id="u" required placeholder="example.com" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
        <div><label className="label" htmlFor="s">Target service (optional)</label><input id="s" maxLength={120} placeholder="SEO, web development…" className="input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} /></div>
        <div className="sm:col-span-3"><button className="btn btn-primary" disabled={busy === "research"}>{busy === "research" ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Research</button></div>
      </form>

      {profile && (
        <>
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">{ai ? "AI-assisted analysis" : "Basic analysis"} <span className="badge ml-2">{ai ? "AI" : "Python"}</span></h2>
              <button className="btn" onClick={analyze} disabled={!aiAvailable || busy === "ai"} title={aiAvailable ? "" : "AI is not configured on the server"}>
                {busy === "ai" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Run AI analysis
              </button>
            </div>
            {!aiAvailable && <p className="text-xs text-slate-500">AI is not configured. Everything else works without it (see Settings).</p>}
            <p className="text-sm"><b>Website:</b> {profile.website_url}<br /><b>Title:</b> {profile.title || "—"}<br /><b>Meta description:</b> {profile.meta_description || "—"}</p>
            <p className="text-sm"><b>Summary:</b> {ai?.summary ?? profile.summary}</p>
            {profile.headings.length > 0 && <div><p className="text-sm font-medium">Main headings</p><ul className="list-disc pl-5 text-sm">{profile.headings.slice(0, 8).map((h) => <li key={h}>{h}</li>)}</ul></div>}
            <div><p className="text-sm font-medium">Possible opportunities (suggestions, not confirmed problems)</p>
              <ul className="list-disc pl-5 text-sm">
                {ai ? ai.opportunities.map((o) => <li key={o.title}><b>{o.title}:</b> {o.why}</li>) : profile.suggested_opportunities.map((o) => <li key={o}>{o}</li>)}
              </ul></div>
            <div><p className="text-sm font-medium">Research limitations</p><ul className="list-disc pl-5 text-sm text-slate-600">{profile.limitations.map((l) => <li key={l}>{l}</li>)}</ul></div>
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold text-slate-900">Outreach draft <span className="badge ml-2">{emailSource === "ai" ? "AI-generated" : "Template"}</span></h2>
            <div><label className="label" htmlFor="sub">Subject</label><input id="sub" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><label className="label" htmlFor="bod">Message</label><textarea id="bod" rows={10} className="input" value={body} onChange={(e) => setBody(e.target.value)} /></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={copy}><Copy size={16} /> Copy</button>
              <button className="btn" disabled={!aiAvailable || busy === "email"} onClick={() => draft(profile, true, ai?.summary)}><Sparkles size={16} /> Regenerate with AI</button>
              <button className="btn" disabled={busy === "email"} onClick={() => draft(profile, false)}>Use template</button>
              <button className="btn btn-primary" onClick={save}><Save size={16} /> Save prospect</button>
            </div>
            <p className="text-xs text-slate-500">Drafts are never sent automatically. Review before using.</p>
          </section>
        </>
      )}
    </div>
  );
}
