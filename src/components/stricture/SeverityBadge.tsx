import { Severity, severityClasses } from "@/lib/scanner";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${severityClasses(severity)}`}>
      {severity}
    </span>
  );
}
