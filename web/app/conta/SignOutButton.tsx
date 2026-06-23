"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .sign-out-btn { transition: color var(--dur-fast) ease; }
          .sign-out-btn:hover { color: var(--danger); }
        }
      `}</style>
      <button
        onClick={handleSignOut}
        className="sign-out-btn"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--slate-500)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        Ieși din cont
      </button>
    </>
  );
}
