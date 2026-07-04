import { Link } from "react-router-dom";
import { Shell } from "@/components/stricture/Shell";
import { Button } from "@/components/ui/button";
import { Shield, Search, FileWarning, Network, Download, Terminal } from "lucide-react";

export default function Landing() {
  return (
    <Shell>
      <section className="container py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-6">
          <Shield className="h-3.5 w-3.5 text-primary" /> MCP security · v0.1
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
          Least-privilege scanner for <span className="text-primary">MCP agents</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Stricture inspects your MCP server configs, maps agent-to-tool access, flags over-permissioned
          connections, and exports a signed audit report.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth"><Button size="lg">Run a scan</Button></Link>
          <a href="#how"><Button size="lg" variant="outline">How it works</Button></a>
        </div>
      </section>

      <section id="how" className="container py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: Search, title: "Parse configs", body: "Drop in your mcp.json. Stricture extracts servers, commands, tools, transports, env vars, and credential hints." },
          { icon: FileWarning, title: "Score risk", body: "A deterministic risk engine flags shell execution, broad DB access, secrets in config, unknown remotes, and more." },
          { icon: Network, title: "Map access", body: "See exactly which agents can reach which tools. Spot stale references and over-scoped agents." },
        ].map((f) => (
          <div key={f.title} className="rounded-md border border-border bg-card p-6">
            <f.icon className="h-5 w-5 text-primary mb-3" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="container py-16">
        <div className="rounded-md border border-border bg-card p-8 flex flex-col md:flex-row items-start gap-6">
          <Terminal className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">CLI-first, dashboard-friendly</h3>
            <p className="text-sm text-muted-foreground mt-2">
              The scanner core is a pure function over your config JSON — same engine the dashboard runs
              is meant to ship as <code className="text-primary">npx stricture</code> next.
            </p>
          </div>
          <Link to="/auth"><Button variant="outline"><Download className="h-4 w-4 mr-2" />Export audit report</Button></Link>
        </div>
      </section>
    </Shell>
  );
}
