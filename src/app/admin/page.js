"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = ["Overview", "Courses", "Students", "Payments"];

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [institute, setInstitute] = useState(null);
  const [tab, setTab] = useState("Overview");

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);

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
      await loadAll(instData.id);
    }
    setChecking(false);
  }

  async function loadAll(instituteId) {
    const [coursesRes, studentsRes, paymentsRes] = await Promise.all([
      supabase.from("courses").select("*").eq("institute_id", instituteId).order("created_at", { ascending: false }),
      supabase.from("students").select("*, courses(name)").eq("institute_id", instituteId).order("created_at", { ascending: false }),
      supabase.from("payments").select("*, students(full_name)").eq("institute_id", instituteId).order("created_at", { ascending: false }),
    ]);
    setCourses(coursesRes.data || []);
    setStudents(studentsRes.data || []);
    setPayments(paymentsRes.data || []);
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

        {institute.status === "active" && (
          <>
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
              <OverviewTab students={students.length} courses={courses.length} revenue={totalRevenue} />
            )}
            {tab === "Courses" && (
              <CoursesTab
                supabase={supabase}
                instituteId={institute.id}
                courses={courses}
                onChange={() => loadAll(institute.id)}
              />
            )}
            {tab === "Students" && (
              <StudentsTab
                supabase={supabase}
                instituteId={institute.id}
                students={students}
                courses={courses}
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
          </>
        )}
      </main>
    </div>
  );
}

function StatusCard({ type }) {
  const isBlocked = type === "blocked";
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <div
        className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
        style={{ background: isBlocked ? "#FBEAE6" : "#FFF3DA", color: isBlocked ? "var(--danger)" : "#946200" }}
      >
        {isBlocked ? "⛔" : "⏳"}
      </div>
      <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
        {isBlocked ? "Account block hai" : "Approval ka wait ho raha hai"}
      </h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {isBlocked
          ? "Iski wajah jaanne ke liye FeeMitra support se sampark karo."
          : "Tumhara registration payment verify hone ke baad Super Admin approve karenge."}
      </p>
    </div>
  );
}

function OverviewTab({ students, courses, revenue }) {
  return (
    <>
      <h1 className="font-display text-2xl font-bold mb-8" style={{ color: "var(--navy)" }}>
        Welcome back!
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="Students" value={students} />
        <StatCard label="Courses" value={courses} />
        <StatCard label="Total Collected" value={`₹${revenue.toLocaleString("en-IN")}`} />
      </div>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border" style={{ borderColor: "#EEF0F4" }}>
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: "var(--navy)" }}>{value}</p>
    </div>
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

function CoursesTab({ supabase, instituteId, courses, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", duration_months: "", total_fee: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("courses").insert({
      institute_id: instituteId,
      name: form.name,
      duration_months: Number(form.duration_months) || null,
      total_fee: Number(form.total_fee) || 0,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ name: "", duration_months: "", total_fee: "" });
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
          onClick={() => setShowForm((s) => !s)}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--navy)" }}
        >
          {showForm ? "Cancel" : "+ Add Course"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-6 mb-6 grid sm:grid-cols-3 gap-4 items-end">
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
            {saving ? "Saving..." : "Save Course"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F0F1F5" }}>
              <th className="text-left px-4 py-3">Naam</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Fee</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-t" style={{ borderColor: "#EEF0F4" }}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.duration_months ? `${c.duration_months} months` : "—"}</td>
                <td className="px-4 py-3">₹{Number(c.total_fee || 0).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(c.id)} className="text-xs" style={{ color: "var(--danger)" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>Koi course nahi hai abhi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Students ---------------- */

function StudentsTab({ supabase, instituteId, students, courses, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", father_name: "", phone: "", email: "", address: "", course_id: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("students").insert({
      institute_id: instituteId,
      full_name: form.full_name,
      father_name: form.father_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      course_id: form.course_id || null,
      admission_date: new Date().toISOString().slice(0, 10),
      status: "active",
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ full_name: "", father_name: "", phone: "", email: "", address: "", course_id: "" });
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
          onClick={() => setShowForm((s) => !s)}
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--navy)" }}
        >
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-6 mb-6 grid sm:grid-cols-2 gap-4 items-end">
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
            {saving ? "Saving..." : "Save Student"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F0F1F5" }}>
              <th className="text-left px-4 py-3">Naam</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Course</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t" style={{ borderColor: "#EEF0F4" }}>
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3">{s.phone || "—"}</td>
                <td className="px-4 py-3">{s.courses?.name || "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(s.id)} className="text-xs" style={{ color: "var(--danger)" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>Koi student nahi hai abhi.</td></tr>
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
