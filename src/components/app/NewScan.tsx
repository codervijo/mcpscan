import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Shell } from "@/components/stricture/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { runScan, SAMPLE_CONFIG } from "@/lib/scanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Upload, Sparkles } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";

function NewScan() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    if (!name) setName(f.name.replace(/\.json$/i, ""));
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function loadSample() {
    setText(JSON.stringify(SAMPLE_CONFIG, null, 2));
    setFilename("sample-mcp.json");
    if (!name) setName("Sample MCP config");
  }

  async function submit() {
    if (!user) return;
    setBusy(true);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(text); }
      catch { throw new Error("Config is not valid JSON."); }
      const result = runScan(parsed);
      const { data, error } = await supabase.from("scans").insert({
        user_id: user.id,
        name: name || "Untitled scan",
        source_filename: filename,
        raw_config: parsed as any,
        parsed: result.parsed as any,
        findings: result.findings as any,
        risk_score: result.riskScore,
        risk_numeric: result.riskNumeric,
      }).select("id").single();
      if (error) throw error;
      toast.success("Scan complete");
      nav(`/scans/${data!.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="container max-w-3xl py-10">
        <h1 className="text-2xl font-semibold tracking-tight">New scan</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload an MCP config JSON, or paste it directly.</p>

        <div className="mt-6 space-y-6 rounded-md border border-border bg-card p-6">
          <div>
            <Label htmlFor="name">Scan name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production MCP · 2026-07" />
          </div>

          <div>
            <Label>Config source</Label>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/40 cursor-pointer hover:bg-secondary text-sm">
                <Upload className="h-4 w-4" />
                <span>Upload JSON</span>
                <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
              </label>
              <Button type="button" variant="outline" size="sm" onClick={loadSample}>
                <Sparkles className="h-4 w-4 mr-2" />Load sample
              </Button>
              {filename && <span className="text-xs text-muted-foreground">{filename}</span>}
            </div>
          </div>

          <div>
            <Label htmlFor="cfg">Config JSON</Label>
            <Textarea id="cfg" value={text} onChange={(e) => setText(e.target.value)} rows={16} className="font-mono text-xs" placeholder='{ "mcpServers": { ... } }' />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy || !text.trim()}>{busy ? "Scanning…" : "Run scan"}</Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export default function NewScanPage() {
  return <AppFrame><NewScan /></AppFrame>;
}
