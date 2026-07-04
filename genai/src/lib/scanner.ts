// Stricture scanner core.
// Parses MCP config JSON into a normalized shape and runs the risk engine.
// Structured so the same functions can be reused by a future CLI/parser.

export type Severity = "low" | "medium" | "high" | "critical";

export interface ParsedTool {
  name: string;
  description?: string;
  server: string;
}

export interface ParsedServer {
  name: string;
  command?: string;
  args: string[];
  transport: "stdio" | "http" | "sse" | "unknown";
  url?: string;
  envRefs: string[];
  tools: string[];
  credentialHints: string[];
  raw: unknown;
}

export interface ParsedAgent {
  name: string;
  servers: string[];
  tools: string[];
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  server?: string;
  agent?: string;
  tool?: string;
  suggestion: string;
}

export interface ParsedConfig {
  servers: ParsedServer[];
  agents: ParsedAgent[];
  tools: ParsedTool[];
}

export interface ScanResult {
  parsed: ParsedConfig;
  findings: Finding[];
  riskScore: Severity;
  riskNumeric: number;
}

const DANGEROUS_TOOL_PATTERNS = [
  /delete/i, /drop/i, /remove/i, /destroy/i, /truncate/i,
  /write/i, /update/i, /admin/i, /root/i, /sudo/i,
  /exec/i, /shell/i, /spawn/i, /run[_-]?command/i,
  /wipe/i, /overwrite/i, /migrate/i,
];

const SHELL_COMMANDS = ["sh", "bash", "zsh", "cmd", "powershell", "pwsh", "node", "python", "python3", "deno"];
const CREDENTIAL_KEYS = /(token|secret|password|apikey|api_key|key|credential|auth|bearer)/i;
const DB_PATTERNS = [/postgres/i, /mysql/i, /mongo/i, /redis/i, /supabase/i, /sqlite/i, /database/i, /db[_-]?url/i];

function detectTransport(server: any): ParsedServer["transport"] {
  if (server?.transport) {
    const t = String(server.transport).toLowerCase();
    if (t.includes("http")) return "http";
    if (t.includes("sse")) return "sse";
    if (t.includes("stdio")) return "stdio";
  }
  if (server?.url) return String(server.url).includes("sse") ? "sse" : "http";
  if (server?.command) return "stdio";
  return "unknown";
}

function extractEnvRefs(server: any): string[] {
  const refs = new Set<string>();
  const scan = (v: unknown) => {
    if (typeof v === "string") {
      const m = v.match(/\$\{?([A-Z0-9_]+)\}?/g);
      m?.forEach((x) => refs.add(x.replace(/[${}]/g, "")));
    } else if (Array.isArray(v)) v.forEach(scan);
    else if (v && typeof v === "object") Object.values(v).forEach(scan);
  };
  scan(server?.args);
  scan(server?.env);
  if (server?.env && typeof server.env === "object") {
    Object.keys(server.env).forEach((k) => refs.add(k));
  }
  return [...refs];
}

function extractCredentialHints(server: any): string[] {
  const hints: string[] = [];
  const walk = (obj: any, path: string[] = []) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      const p = [...path, k];
      if (CREDENTIAL_KEYS.test(k) && typeof v === "string" && v.length > 0 && !v.startsWith("$")) {
        hints.push(p.join("."));
      }
      if (v && typeof v === "object") walk(v, p);
    }
  };
  walk(server);
  return hints;
}

export function parseMcpConfig(input: unknown): ParsedConfig {
  const servers: ParsedServer[] = [];
  const tools: ParsedTool[] = [];
  const agents: ParsedAgent[] = [];

  const root: any = input ?? {};
  const serverBlock = root.mcpServers ?? root.servers ?? root.mcp?.servers ?? {};

  const entries: [string, any][] = Array.isArray(serverBlock)
    ? serverBlock.map((s: any, i: number) => [s.name ?? `server_${i}`, s])
    : Object.entries(serverBlock);

  for (const [name, s] of entries) {
    const toolList: string[] = Array.isArray(s?.tools)
      ? s.tools.map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean)
      : [];
    const server: ParsedServer = {
      name,
      command: s?.command,
      args: Array.isArray(s?.args) ? s.args.map(String) : [],
      transport: detectTransport(s),
      url: s?.url,
      envRefs: extractEnvRefs(s),
      tools: toolList,
      credentialHints: extractCredentialHints(s),
      raw: s,
    };
    servers.push(server);
    for (const t of toolList) {
      tools.push({ name: t, server: name });
    }
  }

  const agentBlock = root.agents ?? root.assistants ?? {};
  const agentEntries: [string, any][] = Array.isArray(agentBlock)
    ? agentBlock.map((a: any, i: number) => [a.name ?? `agent_${i}`, a])
    : Object.entries(agentBlock);

  for (const [name, a] of agentEntries) {
    const srv: string[] = Array.isArray(a?.servers)
      ? a.servers.map(String)
      : Array.isArray(a?.mcpServers) ? a.mcpServers.map(String) : [];
    const tl: string[] = Array.isArray(a?.tools) ? a.tools.map(String) : [];
    agents.push({ name, servers: srv, tools: tl });
  }

  if (agents.length === 0 && servers.length > 0) {
    agents.push({ name: "default", servers: servers.map((s) => s.name), tools: [] });
  }

  return { servers, agents, tools };
}

const SEV_WEIGHT: Record<Severity, number> = { low: 1, medium: 3, high: 6, critical: 10 };

export function runRiskEngine(parsed: ParsedConfig): Finding[] {
  const findings: Finding[] = [];
  let counter = 0;
  const id = () => `f_${++counter}`;
  const serverNames = new Set(parsed.servers.map((s) => s.name));

  for (const s of parsed.servers) {
    for (const t of s.tools) {
      if (DANGEROUS_TOOL_PATTERNS.some((r) => r.test(t))) {
        findings.push({
          id: id(), severity: "high",
          title: `Write/admin tool exposed: ${t}`,
          detail: `Server "${s.name}" exposes tool "${t}" which matches a mutating/admin pattern.`,
          server: s.name, tool: t,
          suggestion: `Gate "${t}" behind explicit approval or remove it if agents don't need write access.`,
        });
      }
    }

    if (s.command && SHELL_COMMANDS.includes((s.command.toLowerCase().split("/").pop() ?? ""))) {
      findings.push({
        id: id(), severity: "critical",
        title: "Shell/interpreter as MCP command",
        detail: `Server "${s.name}" launches "${s.command}" directly, allowing arbitrary code execution paths.`,
        server: s.name,
        suggestion: "Replace with a purpose-built binary or a locked-down wrapper script.",
      });
    }

    const dbHit = [s.command ?? "", ...s.args, ...s.envRefs].some((v) => DB_PATTERNS.some((r) => r.test(v)));
    if (dbHit && s.tools.some((t) => /query|sql|exec|run/i.test(t))) {
      findings.push({
        id: id(), severity: "high",
        title: "Broad database access",
        detail: `Server "${s.name}" appears to expose raw database queries.`,
        server: s.name,
        suggestion: "Restrict to read-only views or specific stored procedures. Use a scoped DB role.",
      });
    }

    if (s.credentialHints.length > 0) {
      findings.push({
        id: id(), severity: "critical",
        title: "Secret literal in config",
        detail: `Fields ${s.credentialHints.join(", ")} on "${s.name}" appear to contain literal credentials.`,
        server: s.name,
        suggestion: "Move secrets to environment variables and reference with $VAR syntax.",
      });
    }

    if ((s.transport === "http" || s.transport === "sse") && s.url) {
      try {
        const host = new URL(s.url).hostname;
        const trusted = /localhost|127\.0\.0\.1|\.internal$/i.test(host);
        if (!trusted) {
          findings.push({
            id: id(), severity: "medium",
            title: `Remote MCP server: ${host}`,
            detail: `Server "${s.name}" connects to an external host (${host}).`,
            server: s.name,
            suggestion: "Confirm the remote server is on your allowlist and pin its identity.",
          });
        }
      } catch { /* invalid URL */ }
    }

    if (s.envRefs.length > 8) {
      findings.push({
        id: id(), severity: "medium",
        title: "Excessive environment access",
        detail: `Server "${s.name}" references ${s.envRefs.length} env vars.`,
        server: s.name,
        suggestion: "Trim the env allowlist to only what this server actually needs.",
      });
    }

    const rawAny = s.raw as any;
    if (!rawAny?.description && !rawAny?.owner && !rawAny?.metadata) {
      findings.push({
        id: id(), severity: "low",
        title: "No audit metadata",
        detail: `Server "${s.name}" has no description/owner/metadata for auditing.`,
        server: s.name,
        suggestion: "Add owner + description fields so this server is traceable.",
      });
    }
  }

  for (const a of parsed.agents) {
    for (const sname of a.servers) {
      if (!serverNames.has(sname)) {
        findings.push({
          id: id(), severity: "medium",
          title: "Agent references unknown server",
          detail: `Agent "${a.name}" declares server "${sname}" which is not defined.`,
          agent: a.name, server: sname,
          suggestion: "Remove the stale reference or add the missing server definition.",
        });
      }
    }
    if (a.servers.length > 3) {
      findings.push({
        id: id(), severity: "medium",
        title: "Agent connected to many servers",
        detail: `Agent "${a.name}" connects to ${a.servers.length} servers — verify each is needed.`,
        agent: a.name,
        suggestion: "Split agents by responsibility so each connects to the minimum set of servers.",
      });
    }
  }

  return findings;
}

export function scoreRisk(findings: Finding[]): { riskScore: Severity; riskNumeric: number } {
  const num = findings.reduce((n, f) => n + SEV_WEIGHT[f.severity], 0);
  let riskScore: Severity = "low";
  if (findings.some((f) => f.severity === "critical") || num >= 20) riskScore = "critical";
  else if (findings.some((f) => f.severity === "high") || num >= 10) riskScore = "high";
  else if (num >= 4) riskScore = "medium";
  return { riskScore, riskNumeric: num };
}

export function runScan(input: unknown): ScanResult {
  const parsed = parseMcpConfig(input);
  const findings = runRiskEngine(parsed);
  const { riskScore, riskNumeric } = scoreRisk(findings);
  return { parsed, findings, riskScore, riskNumeric };
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function severityClasses(sev: Severity): string {
  switch (sev) {
    case "critical": return "bg-severity-critical/15 text-severity-critical border-severity-critical/40";
    case "high": return "bg-severity-high/15 text-severity-high border-severity-high/40";
    case "medium": return "bg-severity-medium/15 text-severity-medium border-severity-medium/40";
    default: return "bg-severity-low/15 text-severity-low border-severity-low/40";
  }
}

export const SAMPLE_CONFIG = {
  mcpServers: {
    filesystem: {
      command: "bash",
      args: ["-c", "mcp-fs --root /"],
      env: { FS_TOKEN: "sk_live_abc123DEADBEEF" },
      tools: ["read_file", "write_file", "delete_file", "exec_shell"],
    },
    postgres: {
      command: "mcp-postgres",
      args: ["--url", "$DATABASE_URL"],
      env: { DATABASE_URL: "", PGPASSWORD: "", API_KEY: "", TOKEN: "", SECRET: "", EXTRA1: "", EXTRA2: "", EXTRA3: "", EXTRA4: "" },
      tools: ["run_query", "list_tables"],
    },
    docs: {
      transport: "http",
      url: "https://mcp.example-vendor.com/sse",
      tools: ["search_docs"],
      description: "Public docs search",
      owner: "platform@company.com",
    },
  },
  agents: {
    "ops-bot": { servers: ["filesystem", "postgres", "docs", "ghost-server"] },
    "docs-bot": { servers: ["docs"] },
  },
};
