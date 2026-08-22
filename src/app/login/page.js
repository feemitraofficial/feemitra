"use client";

import { useState } from "react";
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
      router.push("/");
    }
  }

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>
          Sign In
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Apne FeeMitra account me login karo
        </p>

        {error && (
          <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: "#FBEAE6", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-4"
            style={{ borderColor: "#E2E4EA" }}
          />

          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-6"
            style={{ borderColor: "#E2E4EA" }}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg py-2.5 font-semibold text-white"
            style={{ background: "var(--navy)" }}
          >
            {submitting ? "Sign in ho raha hai..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
