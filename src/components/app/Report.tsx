import { useEffect, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { Shell } from "@/components/stricture/Shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/stricture/SeverityBadge";
import { Finding, ParsedConfig, SEVERITY_ORDER, Severity } from "@/lib/scanner";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";

interface ScanFull {
  id: string; name: string; source_filename: string | null;
  parsed: ParsedConfig; findings: Finding[];
  risk_score: Severity; risk_numeric: number; created_at: string;
}

function Report() {
  const { id } = useParams();
  const [scan, setScan] = useState<ScanFull | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("scans").select("*").eq("id", id).maybeSingle();
      setScan(data as any);
    })();
  }, [id]);

  function downloadJson() {
    if (!scan) return;
    const blob = new Blob([JSON.stringify({
      report: "Stricture audit report",
      generated_at: new Date().toISOString(),
      scan: {
        id: scan.id, name: scan.name, created_at: scan.created_at,
        source_filename: scan.source_filename,
        risk_score: scan.risk_score, risk_numeric: scan.risk_numeric,
      },
      parsed: scan.parsed, findings: scan.findings,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `stricture-${scan.name.replace(/\s+/g, "-")}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!scan) return <Shell><div className="container py-10 text-muted-foreground">Loading…</div></Shell>;

  return (
    <Shell>
      <div className="container max-w-4xl py-8 print:py-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to={`/scans/${scan.id}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to scan
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
            <Button onClick={downloadJson}><Download className="h-4 w-4 mr-2" />Download JSON</Button>
          </div>
        </div>

        <article className="rounded-md border border-border bg-card p-8 print:border-0 print:bg-transparent space-y-6">
          <header className="border-b border-border pb-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Stricture audit report</div>
            <h1 className="text-2xl font-semibold mt-1">{scan.name}</h1>
            <div className="text-xs text-muted-foreground mt-2">
              Generated {new Date().toLocaleString()} · Scan run {new Date(scan.created_at).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <SeverityBadge severity={scan.risk_score} />
              <span className="text-sm text-muted-foreground">risk score · {scan.risk_numeric} weighted points · {scan.findings.length} findings</span>
            </div>
          </header>

          <section>
            <h2 className="font-semibold mb-2">Inventory</h2>
            <ul className="text-sm text-muted-foreground list-disc pl-5">
              <li>{scan.parsed.servers.length} MCP servers</li>
              <li>{scan.parsed.agents.length} agents</li>
              <li>{scan.parsed.tools.length} tools exposed</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Findings</h2>
            {scan.findings.length === 0 && <p className="text-sm text-muted-foreground">No findings.</p>}
            {SEVERITY_ORDER.map((sev) => {
              const items = scan.findings.filter((f) => f.severity === sev);
              if (!items.length) return null;
              return (
                <div key={sev} className="mt-4">
                  <div className="flex items-center gap-2 mb-2"><SeverityBadge severity={sev} /><span className="text-sm text-muted-foreground">{items.length}</span></div>
                  <ol className="space-y-3">
                    {items.map((f, i) => (
                      <li key={f.id} className="text-sm">
                        <div className="font-medium">{i + 1}. {f.title}</div>
                        <div className="text-muted-foreground">{f.detail}</div>
                        <div className="mt-1"><span className="text-primary">Fix: </span><span className="text-muted-foreground">{f.suggestion}</span></div>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>

          <section>
            <h2 className="font-semibold mb-2">Agent-to-server map</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              {scan.parsed.agents.map((a) => (
                <li key={a.name}><span className="text-foreground font-mono">{a.name}</span> → {a.servers.join(", ") || "—"}</li>
              ))}
            </ul>
          </section>
        </article>
      </div>
    </Shell>
  );
}

export default function ReportPage() {
  return <AppFrame><Report /></AppFrame>;
}
