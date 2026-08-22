"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SuperAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: adminRow } = await supabase
      .from("institute_admins")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (!adminRow || adminRow.role !== "super_admin") {
      router.push("/login");
      return;
    }

    setChecking(false);
    loadInstitutes();
  }

  async function loadInstitutes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("institutes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setInstitutes(data);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from("institutes").update({ status }).eq("id", id);
    loadInstitutes();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <header
        style={{ background: "var(--navy)" }}
        className="px-6 py-4 flex justify-between items-center"
      >
        <h1 className="font-display text-xl font-bold text-white">
          FeeMitra — Super Admin
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-white/80 hover:text-white"
        >
          Logout
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-lg font-bold" style={{ color: "var(--navy)" }}>
            Sab Institutes ({institutes.length})
          </h2>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading institutes...</p>
        ) : institutes.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Abhi koi institute register nahi hua.</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F0F1F5" }}>
                  <th className="text-left px-4 py-3">Naam</th>
                  <th className="text-left px-4 py-3">Slug</th>
                  <th className="text-left px-4 py-3">Owner Email</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {institutes.map((inst) => (
                  <tr key={inst.id} className="border-t" style={{ borderColor: "#EEF0F4" }}>
                    <td className="px-4 py-3 font-medium">{inst.name}</td>
                    <td className="px-4 py-3">{inst.slug}</td>
                    <td className="px-4 py-3">{inst.owner_email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          background:
                            inst.status === "active"
                              ? "#E5F3EC"
                              : inst.status === "blocked"
                              ? "#FBEAE6"
                              : "#FFF3DA",
                          color:
                            inst.status === "active"
                              ? "var(--success)"
                              : inst.status === "blocked"
                              ? "var(--danger)"
                              : "#8A6A1E",
                        }}
                      >
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{inst.plan}</td>
                    <td className="px-4 py-3 space-x-2">
                      {inst.status !== "active" && (
                        <button
                          onClick={() => updateStatus(inst.id, "active")}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                          style={{ background: "var(--success)" }}
                        >
                          Approve
                        </button>
                      )}
                      {inst.status !== "blocked" && (
                        <button
                          onClick={() => updateStatus(inst.id, "blocked")}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                          style={{ background: "var(--danger)" }}
                        >
                          Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
