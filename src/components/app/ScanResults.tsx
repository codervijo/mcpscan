import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { Shell } from "@/components/stricture/Shell";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge } from "@/components/stricture/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Finding, ParsedConfig, SEVERITY_ORDER, Severity } from "@/lib/scanner";
import { Download, ArrowLeft, ArrowRight } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";

interface ScanFull {
  id: string;
  name: string;
  source_filename: string | null;
  parsed: ParsedConfig;
  findings: Finding[];
  risk_score: Severity;
  risk_numeric: number;
  created_at: string;
}

function ScanResults() {
  const { id } = useParams();
  const [scan, setScan] = useState<ScanFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("scans").select("*").eq("id", id).maybeSingle();
      setScan(data as any);
      setLoading(false);
    })();
  }, [id]);

  const findingsBySeverity = useMemo(() => {
    if (!scan) return {} as Record<Severity, Finding[]>;
    const out: Record<Severity, Finding[]> = { critical: [], high: [], medium: [], low: [] };
    for (const f of scan.findings) out[f.severity].push(f);
    return out;
  }, [scan]);

  if (loading) return <Shell><div className="container py-10 text-muted-foreground">Loading…</div></Shell>;
  if (!scan) return <Shell><div className="container py-10">Scan not found. <Link className="text-primary" to="/dashboard">Back</Link></div></Shell>;

  return (
    <Shell>
      <div className="container py-8">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{scan.name}</h1>
            <p className="text-sm text-muted-foreground">
              {scan.source_filename ?? "inline"} · {new Date(scan.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk score</div>
              <div className="flex items-center gap-2 mt-1"><SeverityBadge severity={scan.risk_score} /><span className="text-sm text-muted-foreground">{scan.risk_numeric} pts</span></div>
            </div>
            <Link to={`/scans/${scan.id}/report`}><Button variant="outline"><Download className="h-4 w-4 mr-2" />Export report</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <Stat label="Servers" value={scan.parsed.servers.length} />
          <Stat label="Agents" value={scan.parsed.agents.length} />
          <Stat label="Tools" value={scan.parsed.tools.length} />
          <Stat label="Findings" value={scan.findings.length} />
          <Stat label="Critical" value={findingsBySeverity.critical.length} />
        </div>

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graph">Permission graph</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-4">
            {scan.parsed.servers.map((s) => (
              <div key={s.name} className="rounded-md border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {s.transport} · {s.command ?? s.url ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{s.tools.length} tools · {s.envRefs.length} env</div>
                </div>
                {s.tools.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.tools.map((t) => (
                      <span key={t} className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-foreground/80 border border-border">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="graph" className="mt-6">
            <PermissionGraph parsed={scan.parsed} />
          </TabsContent>

          <TabsContent value="findings" className="mt-6 space-y-6">
            {SEVERITY_ORDER.map((sev) =>
              findingsBySeverity[sev].length === 0 ? null : (
                <div key={sev}>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={sev} />
                    <span className="text-sm text-muted-foreground">{findingsBySeverity[sev].length} finding(s)</span>
                  </div>
                  <div className="space-y-2">
                    {findingsBySeverity[sev].map((f) => (
                      <div key={f.id} className="rounded-md border border-border bg-card p-4">
                        <div className="font-medium text-sm">{f.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{f.detail}</div>
                        <div className="text-xs mt-3 border-t border-border pt-3">
                          <span className="text-primary font-medium">Suggested fix: </span>
                          <span className="text-muted-foreground">{f.suggestion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
            {scan.findings.length === 0 && <div className="text-sm text-muted-foreground">No findings. Nice.</div>}
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function PermissionGraph({ parsed }: { parsed: ParsedConfig }) {
  const serverSet = new Set(parsed.servers.map((s) => s.name));
  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="space-y-6">
        {parsed.agents.map((a) => (
          <div key={a.name}>
            <div className="text-sm font-semibold">{a.name}</div>
            <div className="mt-2 space-y-2">
              {a.servers.length === 0 && <div className="text-xs text-muted-foreground">No server connections.</div>}
              {a.servers.map((sname) => {
                const server = parsed.servers.find((s) => s.name === sname);
                const missing = !serverSet.has(sname);
                return (
                  <div key={sname} className={`flex items-start gap-3 rounded-md border p-3 ${missing ? "border-severity-medium/40 bg-severity-medium/5" : "border-border bg-secondary/30"}`}>
                    <span className="text-xs text-muted-foreground font-mono mt-0.5">agent</span>
                    <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-mono">{sname}{missing && <span className="ml-2 text-xs text-severity-medium">(undefined)</span>}</div>
                      {server && server.tools.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {server.tools.map((t) => (
                            <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScanResultsPage() {
  return <AppFrame><ScanResults /></AppFrame>;
}
