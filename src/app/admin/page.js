"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [institute, setInstitute] = useState(null);
  const [stats, setStats] = useState({ students: 0, courses: 0, revenue: 0 });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: adminRow } = await supabase
      .from("institute_admins")
      .select("institute_id, role, full_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      router.push("/login");
      return;
    }

    if (adminRow.role === "super_admin") {
      router.push("/super-admin");
      return;
    }

    const { data: instData } = await supabase
      .from("institutes")
      .select("*")
      .eq("id", adminRow.institute_id)
      .single();

    setInstitute(instData);

    if (instData?.status === "active") {
      const [studentsRes, coursesRes, paymentsRes] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }).eq("institute_id", instData.id),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("institute_id", instData.id),
        supabase.from("payments").select("amount").eq("institute_id", instData.id),
      ]);
      const revenue = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setStats({
        students: studentsRes.count || 0,
        courses: coursesRes.count || 0,
        revenue,
      });
    }

    setChecking(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Loading...
      </div>
    );
  }

  if (!institute) return null;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <header style={{ background: "var(--navy)" }} className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {institute.logo_url && (
            <img
              src={institute.logo_url}
              alt={institute.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          )}
          <span className="font-display text-lg font-bold text-white">{institute.name}</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-white/80 hover:text-white">
          Logout
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {institute.status === "pending" && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: "#FFF3DA", color: "#946200" }}
            >
              ⏳
            </div>
            <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
              Approval ka wait ho raha hai
            </h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Tumhara registration payment verify hone ke baad Super Admin approve karenge.
              Approve hote hi is dashboard pe pura access mil jayega.
            </p>
          </div>
        )}

        {institute.status === "blocked" && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: "#FBEAE6", color: "var(--danger)" }}
            >
              ⛔
            </div>
            <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
              Account block hai
            </h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Iski wajah jaanne ke liye FeeMitra support se sampark karo.
            </p>
          </div>
        )}

        {institute.status === "active" && (
          <>
            <h1 className="font-display text-2xl font-bold mb-8" style={{ color: "var(--navy)" }}>
              Welcome back!
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl shadow-sm p-6 border" style={{ borderColor: "#EEF0F4" }}>
                <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>Students</p>
                <p className="text-3xl font-bold" style={{ color: "var(--navy)" }}>{stats.students}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border" style={{ borderColor: "#EEF0F4" }}>
                <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>Courses</p>
                <p className="text-3xl font-bold" style={{ color: "var(--navy)" }}>{stats.courses}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border" style={{ borderColor: "#EEF0F4" }}>
                <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>Total Collected</p>
                <p className="text-3xl font-bold" style={{ color: "var(--navy)" }}>
                  ₹{stats.revenue.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <p className="text-sm mt-8" style={{ color: "var(--muted)" }}>
              Student aur fee management features jaldi aa rahe hain.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
