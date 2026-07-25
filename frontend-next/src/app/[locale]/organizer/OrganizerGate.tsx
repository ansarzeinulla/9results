"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AUTH_CHANGED, getUser } from "@/lib/api";

/** Guards the organizer area. Admins have access to the admin panel only, so
 *  they are redirected to /admin; signed-out visitors are sent to /login.
 *  Children render only for a signed-in organizer. */
export default function OrganizerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    const check = () => {
      const user = getUser();
      if (!user) {
        router.replace("/login");
      } else if (user.role === "ADMIN") {
        router.replace("/admin");
      } else {
        setStatus("ok");
      }
    };
    check();
    window.addEventListener(AUTH_CHANGED, check);
    return () => window.removeEventListener(AUTH_CHANGED, check);
  }, [router]);

  if (status !== "ok") return null;
  return <>{children}</>;
}
