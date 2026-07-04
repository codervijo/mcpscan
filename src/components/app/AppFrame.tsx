// Shared island wrapper for the interactive app pages. Provides the Supabase
// auth context (was App.tsx's <AuthProvider>) and mounts the Sonner toaster
// (was App.tsx's global <Sonner />). Each app route renders its page inside
// this frame as a single client:only island.
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { Toaster as Sonner } from "@/components/ui/sonner";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Sonner />
    </AuthProvider>
  );
}
