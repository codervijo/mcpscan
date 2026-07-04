// Browser-based drop-in shims for the react-router-dom APIs the ported pages
// used. Astro owns file-based routing, so these just map onto the History /
// location API instead of a client-side <Routes> tree.
import * as React from "react";

type To = string;

export function Link({
  to,
  children,
  ...props
}: { to: To; children?: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

type NavClassFn = (state: { isActive: boolean; isPending: boolean }) => string;

export function NavLink({
  to,
  className,
  children,
  ...props
}: {
  to: To;
  className?: string | NavClassFn;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  const isActive = typeof window !== "undefined" && window.location.pathname.replace(/\/$/, "") === to.replace(/\/$/, "");
  const cls = typeof className === "function" ? className({ isActive, isPending: false }) : className;
  return (
    <a href={to} className={cls} {...props}>
      {children}
    </a>
  );
}

export function useNavigate() {
  return (to: To, _opts?: { replace?: boolean }) => {
    if (typeof window !== "undefined") window.location.assign(to);
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): Partial<T> {
  if (typeof window === "undefined") return {} as Partial<T>;
  const parts = window.location.pathname.split("/").filter(Boolean);
  // /scans/:id  and  /scans/:id/report
  if (parts[0] === "scans" && parts[1] && parts[1] !== "new") {
    return { id: parts[1] } as Partial<T>;
  }
  return {} as Partial<T>;
}

export function useLocation() {
  return {
    pathname: typeof window !== "undefined" ? window.location.pathname : "/",
    search: typeof window !== "undefined" ? window.location.search : "",
    hash: typeof window !== "undefined" ? window.location.hash : "",
  };
}
