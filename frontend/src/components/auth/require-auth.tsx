"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAuthToken } from "@/lib/auth/login";

/** Client gate: sessionStorage JWT is invisible to Next middleware. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/sign-in");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return null;
  }

  return children;
}
