"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setError("Email ya password galat hai.");
      return;
    }

    const { data: adminRow } = await supabase
      .from("institute_admins")
      .select("role")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    setSubmitting(false);

    if (adminRow?.role === "super_admin") {
      router.push("/super-admin");
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: "linear-gradient(145deg, var(--navy) 0%, var(--navy-light) 55%, var(--navy) 100%)",
        }}
      >
        {/* decorative glow orbs */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)", transform: "translate(30%,30%)" }}
        />

        <Link href="/" className="relative z-10 inline-flex w-fit">
          <img src="/logo.png" alt="FeeMitra" className="h-14 brightness-0 invert" />
        </Link>

        <div className="relative z-10 max-w-md">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5 tracking-wide"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--gold-light)" }}
          >
            ADMIN CONSOLE
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
            Har fees ka <span style={{ color: "var(--gold)" }}>saaf-saaf</span> hisaab.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#B9C0D4" }}>
            Apne coaching institute ka fee tracking, receipts, aur reporting — sab ek jagah, sirf ek secure login ke peeche.
          </p>
        </div>

        <p className="relative z-10 text-xs" style={{ color: "#7C8399" }}>
          © {new Date().getFullYear()} FeeMitra. Built for coaching institutes.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex lg:hidden justify-center mb-8">
            <img src="/logo.png" alt="FeeMitra" className="h-14" />
          </Link>

          <div
            className="bg-white rounded-3xl p-8 sm:p-9"
            style={{
              border: "1px solid #EEF0F4",
              boxShadow: "0 20px 45px -15px rgba(16, 27, 52, 0.18), 0 8px 16px -8px rgba(16, 27, 52, 0.08)",
            }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "#EEF0FF" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "var(--navy)" }}>
                <path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="font-display text-2xl font-bold mb-1.5" style={{ color: "var(--navy)" }}>
              Sign In
            </h1>
            <p className="text-sm mb-7" style={{ color: "var(--muted)" }}>
              Apne FeeMitra account me login karo
            </p>

            {error && (
              <div
                className="mb-5 text-sm rounded-xl px-4 py-3 flex items-start gap-2"
                style={{ background: "#FBEAE6", color: "var(--danger)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--navy)" }}>
                Email
              </label>
              <div className="relative mb-5">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted)" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6.5A2.5 2.5 0 015.5 4h13A2.5 2.5 0 0121 6.5v11a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-11z"
                      stroke="currentColor" strokeWidth="1.5"
                    />
                    <path d="M4 7l7.4 5.1a1 1 0 001.2 0L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl pl-11 pr-4 py-3 text-sm transition-all outline-none"
                  style={{
                    border: "1.5px solid #E5E7F0",
                    background: "#FAFBFC",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--navy)";
                    e.target.style.background = "#FFFFFF";
                    e.target.style.boxShadow = "0 0 0 4px rgba(16,27,52,0.06)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7F0";
                    e.target.style.background = "#FAFBFC";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--navy)" }}>
                Password
              </label>
              <div className="relative mb-7">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted)" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="4.5" y="10" width="15" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl pl-11 pr-4 py-3 text-sm transition-all outline-none"
                  style={{
                    border: "1.5px solid #E5E7F0",
                    background: "#FAFBFC",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--navy)";
                    e.target.style.background = "#FFFFFF";
                    e.target.style.boxShadow = "0 0 0 4px rgba(16,27,52,0.06)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7F0";
                    e.target.style.background = "#FAFBFC";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl py-3.5 font-semibold text-white text-sm flex items-center justify-center gap-2 transition-transform"
                style={{
                  background: submitting
                    ? "var(--navy-light)"
                    : "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)",
                  boxShadow: "0 10px 24px -8px rgba(16,27,52,0.45)",
                  opacity: submitting ? 0.85 : 1,
                }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Sign in ho raha hai...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "var(--muted)" }}>
            Secure admin access · FeeMitra
          </p>
        </div>
      </div>
    </div>
  );
}
