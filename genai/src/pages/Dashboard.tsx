import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "@/components/stricture/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/stricture/SeverityBadge";
import { Severity } from "@/lib/scanner";
import { PlusCircle, ShieldCheck } from "lucide-react";

interface ScanRow {
  id: string;
  name: string;
  source_filename: string | null;
  risk_score: Severity;
  findings: any[];
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("scans").select("id,name,source_filename,risk_score,findings,created_at").order("created_at", { ascending: false });
      setScans((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const counts = scans.reduce<Record<Severity, number>>((acc, s) => {
    acc[s.risk_score] = (acc[s.risk_score] ?? 0) + 1; return acc;
  }, { low: 0, medium: 0, high: 0, critical: 0 });

  return (
    <Shell>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Audit history for your MCP deployments.</p>
          </div>
          <Link to="/scans/new"><Button><PlusCircle className="h-4 w-4 mr-2" />New scan</Button></Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
            <div key={s} className="rounded-md border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s}</div>
              <div className="mt-1 text-2xl font-semibold">{counts[s]}</div>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="px-4 py-3 border-b border-border text-sm font-medium">Recent scans</div>
          {loading ? (
            <div className="p-8 text-sm text-muted-foreground">Loading…</div>
          ) : scans.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <div className="text-sm text-muted-foreground mb-4">No scans yet.</div>
              <Link to="/scans/new"><Button size="sm">Run your first scan</Button></Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {scans.map((s) => (
                <li key={s.id}>
                  <Link to={`/scans/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/40">
                    <div>
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.source_filename ?? "inline"} · {new Date(s.created_at).toLocaleString()} · {s.findings.length} findings
                      </div>
                    </div>
                    <SeverityBadge severity={s.risk_score} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}
