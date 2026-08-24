"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = ["Overview", "Courses", "Students", "Payments", "Staff"];

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [institute, setInstitute] = useState(null);
  const [tab, setTab] = useState("Overview");

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [staff, setStaff] = useState([]);

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

    const trialExpired =
      instData?.is_trial && instData?.trial_ends_at && new Date(instData.trial_ends_at) < new Date();

    if (instData?.status === "active" && !trialExpired) {
      await loadAll(instData.id);
    }
    setChecking(false);
  }

  async function loadAll(instituteId) {
    const [coursesRes, studentsRes, paymentsRes, staffRes] = await Promise.all([
      supabase.from("courses").select("*").eq("institute_id", instituteId).order("created_at", { ascending: false }),
      supabase.from("students").select("*, courses(name)").eq("institute_id", instituteId).order("created_at", { ascending: false }),
      supabase.from("payments").select("*, students(full_name)").eq("institute_id", instituteId).order("created_at", { ascending: false }),
      supabase.from("institute_admins").select("*").eq("institute_id", instituteId).order("created_at", { ascending: false }),
    ]);
    setCourses(coursesRes.data || []);
    setStudents(studentsRes.data || []);
    setPayments(paymentsRes.data || []);
    setStaff(staffRes.data || []);
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

  const trialExpired = institute.is_trial && institute.trial_ends_at && new Date(institute.trial_ends_at) < new Date();
  const trialDaysLeft = institute.is_trial && institute.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(institute.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <header style={{ background: "var(--navy)" }} className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {institute.logo_url && (
            <img src={institute.logo_url} alt={institute.name} className="h-9 w-9 rounded-full object-cover" />
          )}
          <span className="font-display text-lg font-bold text-white">{institute.name}</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-white/80 hover:text-white">
          Logout
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {institute.status === "pending" && <StatusCard type="pending" />}
        {institute.status === "blocked" && <StatusCard type="blocked" />}
        {institute.status === "active" && trialExpired && <StatusCard type="trial_expired" />}

        {institute.status === "active" && !trialExpired && (
          <>
            {institute.is_trial && (
              <div
                className="rounded-xl px-4 py-3 mb-6 text-sm font-medium"
                style={{ background: "#FFF3DA", color: "#946200" }}
              >
                🎁 Free demo chal raha hai — {trialDaysLeft} din baaki hai.
              </div>
            )}

            <div className="flex gap-2 mb-8 border-b" style={{ borderColor: "#E2E4EA" }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-2 text-sm font-medium -mb-px"
                  style={{
                    color: tab === t ? "var(--navy)" : "var(--muted)",
                    borderBottom: tab === t ? "2px solid var(--navy)" : "2px solid transparent",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "Overview" && (
              <OverviewTab students={students} courses={courses} payments={payments} revenue={totalRevenue} />
            )}
            {tab === "Courses" && (
              <CoursesTab
                supabase={supabase}
                instituteId={institute.id}
                courses={courses}
                students={students}
                onChange={() => loadAll(institute.id)}
              />
            )}
            {tab === "Students" && (
              <StudentsTab
                supabase={supabase}
                instituteId={institute.id}
                students={students}
                courses={courses}
                payments={payments}
                onChange={() => loadAll(institute.id)}
              />
            )}
            {tab === "Payments" && (
              <PaymentsTab
                supabase={supabase}
                instituteId={institute.id}
                institute={institute}
                payments={payments}
                students={students}
                onChange={() => loadAll(institute.id)}
              />
            )}
            {tab === "Staff" && (
              <StaffTab
                supabase={supabase}
                staff={staff}
                onChange={() => loadAll(institute.id)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatusCard({ type }) {
  const isBlocked = type === "blocked";
  const isTrialExpired = type === "trial_expired";
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <div
        className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
        style={{
          background: isBlocked || isTrialExpired ? "#FBEAE6" : "#FFF3DA",
          color: isBlocked || isTrialExpired ? "var(--danger)" : "#946200",
        }}
      >
        {isBlocked ? "⛔" : isTrialExpired ? "⏰" : "⏳"}
      </div>
      <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
        {isBlocked ? "Account block hai" : isTrialExpired ? "Demo khatam ho gaya" : "Approval ka wait ho raha hai"}
      </h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {isBlocked
          ? "Iski wajah jaanne ke liye FeeMitra support se sampark karo."
          : isTrialExpired
          ? "Tumhara 3 din ka free demo khatam ho gaya hai. Aage use karne ke liye registration fee pay karo."
          : "Tumhara registration payment verify hone ke baad Super Admin approve karenge."}
      </p>
    </div>
  );
}

function OverviewTab({ students, courses, payments, revenue }) {
  const paidByStudent = {};
  (payments || []).forEach((p) => {
    if (!p.student_id) return;
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount || 0);
  });
  const pendingFee = students.reduce((sum, s) => {
    const totalFee = Number(courses.find((c) => c.id === s.course_id)?.total_fee || 0);
    const paid = paidByStudent[s.id] || 0;
    return sum + Math.max(0, totalFee - paid);
  }, 0);

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const studentsThisWeek = students.filter((s) => new Date(s.created_at) >= oneWeekAgo).length;

  const thisWeekRevenue = payments
    .filter((p) => new Date(p.paid_on || p.created_at) >= oneWeekAgo)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const lastWeekRevenue = payments
    .filter((p) => {
      const d = new Date(p.paid_on || p.created_at);
      return d >= twoWeeksAgo && d < oneWeekAgo;
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const revenueGrowth = lastWeekRevenue > 0
    ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
    : thisWeekRevenue > 0 ? 100 : 0;

  return (
    <>
      <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>
        Welcome back!
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>Yahan hai aapke institute ka overview.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <IconStatCard
          icon="👥" bg="#EEEBFF" fg="#6D5FFD"
          label="Total Students" value={students.length}
          trend={studentsThisWeek > 0 ? `+${studentsThisWeek} this week` : null}
        />
        <IconStatCard
          icon="💰" bg="#E5F3EC" fg="var(--success)"
          label="Total Collection" value={`₹${revenue.toLocaleString("en-IN")}`}
          trend={thisWeekRevenue > 0 ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}% vs last week` : null}
        />
        <IconStatCard
          icon="📋" bg="#FFF3DA" fg="#946200"
          label="Pending Fee" value={`₹${pendingFee.toLocaleString("en-IN")}`}
          trend={pendingFee === 0 ? "Sab clear hai" : null}
        />
        <IconStatCard
          icon="📚" bg="#E4EEFB" fg="#2A6FDB"
          label="Courses" value={courses.length}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border" style={{ borderColor: "#EEF0F4" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--navy)" }}>Collection — Last 7 Days</p>
          <WeeklyChart payments={payments} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border flex flex-col items-center justify-center text-center" style={{ borderColor: "#EEF0F4" }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3"
            style={{ background: "#EEEBFF", color: "#6D5FFD" }}
          >
            💰
          </div>
          <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>Total Collection</p>
          <p className="text-2xl font-bold" style={{ color: "var(--navy)" }}>₹{revenue.toLocaleString("en-IN")}</p>
        </div>
      </div>
    </>
  );
}

function IconStatCard({ icon, bg, fg, label, value, trend }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border" style={{ borderColor: "#EEF0F4" }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3"
        style={{ background: bg, color: fg }}
      >
        {icon}
      </div>
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>{value}</p>
      {trend && <p className="text-xs font-medium" style={{ color: "var(--success)" }}>{trend}</p>}
    </div>
  );
}

function WeeklyChart({ payments }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const totals = days.map((day) => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return (payments || [])
      .filter((p) => {
        const d = new Date(p.paid_on || p.created_at);
        return d >= day && d < next;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  });

  const max = Math.max(...totals, 1);
  const w = 560;
  const h = 180;
  const padX = 30;
  const padY = 20;
  const stepX = (w - padX * 2) / (totals.length - 1);

  const points = totals.map((v, i) => {
    const x = padX + i * stepX;
    const y = h - padY - (v / max) * (h - padY * 2);
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0]},${h - padY} L${points[0][0]},${h - padY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full h-auto">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6D5FFD" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6D5FFD" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaFill)" />
      <path d={linePath} fill="none" stroke="#6D5FFD" strokeWidth="2.5" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#6D5FFD" />
      ))}
      {labels.map((label, i) => (
        <text
          key={label}
          x={padX + i * stepX}
          y={h + 18}
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted)"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        {...props}
        className="w-full border rounded-lg px-3 py-2"
        style={{ borderColor: "#E2E4EA" }}
      />
    </div>
  );
}

/* ---------------- Courses ---------------- */

function CoursesTab({ supabase, instituteId, courses, students, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", duration_months: "", total_fee: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const palette = [
    { bg: "#EEEBFF", fg: "#6D5FFD" },
    { bg: "#E5F3EC", fg: "var(--success)" },
    { bg: "#E4EEFB", fg: "#2A6FDB" },
    { bg: "#FFF3DA", fg: "#946200" },
    { bg: "#FBEAE6", fg: "var(--danger)" },
  ];

  function studentCount(courseId) {
    return (students || []).filter((s) => s.course_id === courseId).length;
  }

  function startAdd() {
    setEditingId(null);
    setForm({ name: "", duration_months: "", total_fee: "" });
    setShowForm(true);
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      duration_months: c.duration_months || "",
      total_fee: c.total_fee || "",
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      name: form.name,
      duration_months: Number(form.duration_months) || null,
      total_fee: Number(form.total_fee) || 0,
    };
    const { error: err } = editingId
      ? await supabase.from("courses").update(payload).eq("id", editingId)
      : await supabase.from("courses").insert({ institute_id: instituteId, ...payload });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ name: "", duration_months: "", total_fee: "" });
    setEditingId(null);
    setShowForm(false);
    onChange();
  }

  async function handleDelete(id) {
    if (!confirm("Ye course delete karna hai?")) return;
    await supabase.from("courses").delete().eq("id", id);
    onChange();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-bold" style={{ color: "var(--navy)" }}>
          Courses ({courses.length})
        </h2>
        <button
          onClick={() => (showForm ? setShowForm(false) : startAdd())}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--navy)" }}
        >
          {showForm ? "Cancel" : "+ Add Course"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6 mb-6 grid sm:grid-cols-3 gap-4 items-end">
          <Field label="Course Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Duration (months)" type="number" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: e.target.value })} />
          <Field label="Total Fee (₹)" type="number" required value={form.total_fee} onChange={(e) => setForm({ ...form, total_fee: e.target.value })} />
          {error && <p className="text-sm sm:col-span-3" style={{ color: "var(--danger)" }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-3 rounded-lg py-2.5 font-semibold text-white"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
          >
            {saving ? "Saving..." : editingId ? "Update Course" : "Save Course"}
          </button>
        </form>
      )}


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c, i) => {
          const color = palette[i % palette.length];
          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border p-5" style={{ borderColor: "#EEF0F4" }}>
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                  style={{ background: color.bg, color: color.fg }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(c)} className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs" style={{ color: "var(--danger)" }}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="font-display font-bold mb-1" style={{ color: "var(--navy)" }}>{c.name}</p>
              <p className="text-lg font-bold mb-2" style={{ color: color.fg }}>
                ₹{Number(c.total_fee || 0).toLocaleString("en-IN")}
              </p>
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
                <span>{c.duration_months ? `${c.duration_months} months` : "Duration N/A"}</span>
                <span>👤 {studentCount(c.id)} Students</span>
              </div>
            </div>
          );
        })}
        {courses.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-2xl shadow-sm p-8 text-center" style={{ color: "var(--muted)" }}>
            Koi course nahi hai abhi.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Students ---------------- */

function StudentsTab({ supabase, instituteId, students, courses, payments, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ full_name: "", father_name: "", phone: "", email: "", address: "", course_id: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const paidByStudent = {};
  (payments || []).forEach((p) => {
    if (!p.student_id) return;
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount || 0);
  });

  function feeSummary(student) {
    const totalFee = Number(courses.find((c) => c.id === student.course_id)?.total_fee || 0);
    const paid = paidByStudent[student.id] || 0;
    let statusLabel = "Unpaid";
    let statusColor = { background: "#FBEAE6", color: "var(--danger)" };
    if (totalFee > 0 && paid >= totalFee) {
      statusLabel = "Paid";
      statusColor = { background: "#E5F3EC", color: "var(--success)" };
    } else if (paid > 0) {
      statusLabel = "Partial";
      statusColor = { background: "#FFF3DA", color: "#946200" };
    }
    return { totalFee, paid, statusLabel, statusColor };
  }

  function startAdd() {
    setEditingId(null);
    setForm({ full_name: "", father_name: "", phone: "", email: "", address: "", course_id: "" });
    setShowForm(true);
  }

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      full_name: s.full_name || "",
      father_name: s.father_name || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      course_id: s.course_id || "",
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      full_name: form.full_name,
      father_name: form.father_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      course_id: form.course_id || null,
    };
    const { error: err } = editingId
      ? await supabase.from("students").update(payload).eq("id", editingId)
      : await supabase.from("students").insert({
          institute_id: instituteId,
          ...payload,
          admission_date: new Date().toISOString().slice(0, 10),
          status: "active",
        });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ full_name: "", father_name: "", phone: "", email: "", address: "", course_id: "" });
    setEditingId(null);
    setShowForm(false);
    onChange();
  }

  async function handleDelete(id) {
    if (!confirm("Ye student record delete karna hai?")) return;
    await supabase.from("students").delete().eq("id", id);
    onChange();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-bold" style={{ color: "var(--navy)" }}>
          Students ({students.length})
        </h2>
        <button
          onClick={() => (showForm ? setShowForm(false) : startAdd())}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--navy)" }}
        >
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6 mb-6 grid sm:grid-cols-2 gap-4 items-end">
          <Field label="Student Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Field label="Father's Name" value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
          <Field label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div>
            <label className="block text-sm font-medium mb-1">Course</label>
            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              style={{ borderColor: "#E2E4EA" }}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Field label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          {error && <p className="text-sm sm:col-span-2" style={{ color: "var(--danger)" }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-lg py-2.5 font-semibold"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
          >
            {saving ? "Saving..." : editingId ? "Update Student" : "Save Student"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F0F1F5" }}>
              <th className="text-left px-4 py-3">Naam</th>
              <th className="text-left px-4 py-3">Course</th>
              <th className="text-left px-4 py-3">Fee / Paid</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const { totalFee, paid, statusLabel, statusColor } = feeSummary(s);
              return (
                <tr key={s.id} className="border-t" style={{ borderColor: "#EEF0F4" }}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{s.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3">{s.courses?.name || "—"}</td>
                  <td className="px-4 py-3">
                    ₹{paid.toLocaleString("en-IN")} / ₹{totalFee.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={statusColor}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(s)} className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs" style={{ color: "var(--danger)" }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>Koi student nahi hai abhi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Payments ---------------- */

function PaymentsTab({ supabase, instituteId, institute, payments, students, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_id: "", amount: "", payment_mode: "cash", remarks: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("payments").insert({
      institute_id: instituteId,
      student_id: form.student_id || null,
      amount: Number(form.amount) || 0,
      payment_mode: form.payment_mode,
      receipt_number: `RCP-${Date.now()}`,
      paid_on: new Date().toISOString().slice(0, 10),
      remarks: form.remarks || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ student_id: "", amount: "", payment_mode: "cash", remarks: "" });
    setShowForm(false);
    onChange();
  }

  async function downloadReceipt(payment) {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(institute.name, 20, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Fee Receipt", 20, 28);
    doc.setDrawColor(200);
    doc.line(20, 33, 190, 33);

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Receipt No: ${payment.receipt_number}`, 20, 45);
    doc.text(`Date: ${payment.paid_on}`, 140, 45);

    doc.text(`Student: ${payment.students?.full_name || "—"}`, 20, 58);
    doc.text(`Payment Mode: ${payment.payment_mode}`, 20, 66);
    if (payment.remarks) doc.text(`Remarks: ${payment.remarks}`, 20, 74);

    doc.setFontSize(14);
    doc.text(`Amount Paid: Rs. ${Number(payment.amount).toLocaleString("en-IN")}`, 20, 92);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Computer-generated receipt — FeeMitra", 20, 280);

    doc.save(`Receipt-${payment.receipt_number}.pdf`);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-bold" style={{ color: "var(--navy)" }}>
          Payments ({payments.length})
        </h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--navy)" }}
        >
          {showForm ? "Cancel" : "+ Record Payment"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-6 mb-6 grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select
              required
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              style={{ borderColor: "#E2E4EA" }}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <Field label="Amount (₹)" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <div>
            <label className="block text-sm font-medium mb-1">Payment Mode</label>
            <select
              value={form.payment_mode}
              onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              style={{ borderColor: "#E2E4EA" }}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </div>
          <Field label="Remarks (optional)" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          {error && <p className="text-sm sm:col-span-2" style={{ color: "var(--danger)" }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-lg py-2.5 font-semibold"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
          >
            {saving ? "Saving..." : "Record Payment"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F0F1F5" }}>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Mode</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: "#EEF0F4" }}>
                <td className="px-4 py-3 font-medium">{p.students?.full_name || "—"}</td>
                <td className="px-4 py-3">₹{Number(p.amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 capitalize">{p.payment_mode}</td>
                <td className="px-4 py-3">{p.paid_on}</td>
                <td className="px-4 py-3">
                  <button onClick={() => downloadReceipt(p)} className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                    ⬇ PDF
                  </button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>Koi payment record nahi hai abhi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Staff ---------------- */

function StaffTab({ supabase, staff, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function callFunction(name, payload) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Kuch galat ho gaya");
    return body;
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await callFunction("add-staff", form);
      setForm({ full_name: "", email: "", password: "" });
      setShowForm(false);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(authUserId, name) {
    if (!confirm(`"${name}" ko staff se hatana hai? Unka login bhi hat jayega.`)) return;
    try {
      await callFunction("remove-staff", { staff_auth_user_id: authUserId });
      onChange();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-bold" style={{ color: "var(--navy)" }}>
          Staff ({staff.length})
        </h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--navy)" }}
        >
          {showForm ? "Cancel" : "+ Add Staff"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-6 mb-6 grid sm:grid-cols-3 gap-4 items-end">
          <Field label="Staff Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Field label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label="Password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="text-sm sm:col-span-3" style={{ color: "var(--danger)" }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-3 rounded-lg py-2.5 font-semibold text-white"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
          >
            {saving ? "Adding..." : "Add Staff"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F0F1F5" }}>
              <th className="text-left px-4 py-3">Naam</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t" style={{ borderColor: "#EEF0F4" }}>
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                    style={
                      s.role === "admin"
                        ? { background: "#EEEBFF", color: "#6D5FFD" }
                        : { background: "#F0F1F5", color: "var(--muted)" }
                    }
                  >
                    {s.role === "admin" ? "Owner" : s.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {s.role === "staff" ? (
                    <button onClick={() => handleRemove(s.auth_user_id, s.full_name)} className="text-xs" style={{ color: "var(--danger)" }}>
                      Remove
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>Koi staff nahi hai abhi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
