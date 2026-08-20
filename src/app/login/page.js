"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ya password galat hai.");
      setLoading(false);
      return;
    }

    // Check if this user is a super_admin or institute_admin
    const { data: adminRow } = await supabase
      .from("institute_admins")
      .select("role")
      .eq("auth_user_id", data.user.id)
      .single();

    if (!adminRow) {
      setError("Ye account kisi institute se linked nahi hai.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (adminRow.role === "super_admin") {
      router.push("/super-admin");
    } else {
      router.push("/admin");
    }
  }

  return (
    <div
      style={{ background: "var(--navy)" }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm"
      >
        <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>
          FeeMitra
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Login karo apne dashboard me
        </p>

        {error && (
          <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: "#FBEAE6", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-4 outline-none focus:ring-2"
          style={{ borderColor: "#E2E4EA" }}
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-6 outline-none focus:ring-2"
          style={{ borderColor: "#E2E4EA" }}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 font-semibold text-white"
          style={{ background: "var(--navy)" }}
        >
          {loading ? "Login ho raha hai..." : "Login"}
        </button>
      </form>
    </div>
  );
}
