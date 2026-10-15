"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProspects } from "@/lib/store";
import { useToast } from "@/components/Shell";

export default function Settings() {
  const toast = useToast();
  const { clear, prospects } = useProspects();
  const [state, setState] = useState<"loading" | "on" | "off" | "down">("loading");
  useEffect(() => { api<{ ai_available: boolean }>("/api/health").then((h) => setState(h.ai_available ? "on" : "off")).catch(() => setState("down")); }, []);
  const label = { loading: "Checking…", on: "AI features are available", off: "AI is not configured (basic mode)", down: "Backend not reachable" }[state];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold text-slate-900">Optional AI (Gemini)</h2>
        <p><span className="badge">{label}</span></p>
        <p>Research, template outreach drafts, prospects and CSV import/export all work without AI. AI analysis and AI email drafts need a Gemini API key.</p>
        <p>For security, the key is never entered in this app. Set <code>GEMINI_API_KEY</code> as a server-side environment variable (a <code>.env</code> file locally, or Vercel Project Settings, Environment Variables), then restart or redeploy. AI runs only when you click an AI button, to conserve free-tier quota.</p>
      </section>
      <section className="card space-y-3 text-sm">
        <h2 className="font-semibold text-slate-900">Local data</h2>
        <p>Prospects are stored in this browser&apos;s localStorage ({prospects.length} saved). They are not synced across devices. Export a CSV to back them up.</p>
        <button className="btn" onClick={() => { if (confirm("Delete all saved prospects from this browser?")) { clear(); toast("Local data cleared"); } }}>Delete all local data</button>
      </section>
    </div>
  );
}
