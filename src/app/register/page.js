"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const REG_FEE = 999;
const UPI_ID = "coolmahato@axl";
const UPI_NAME = "FeeMitra";

function buildUpiLink(amount) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_NAME,
    am: String(amount),
    cu: "INR",
    tn: "FeeMitra Registration Fee",
  });
  return `upi://pay?${params.toString()}`;
}

export default function RegisterPage() {
  const supabase = createClient();
  const [step, setStep] = useState(1); // 1 = details, 2 = payment, 3 = done
  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    ownerPhone: "",
    password: "",
  });
  const [utr, setUtr] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [instituteId, setInstituteId] = useState(null);
  const [intent, setIntent] = useState("pay"); // "pay" | "trial"

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === "name"
        ? { slug: value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }
        : {}),
    }));
  }

  function validateDetails() {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/; // 10-digit Indian mobile number

    if (!emailRegex.test(form.ownerEmail)) {
      errors.ownerEmail = "Sahi email daalo (jaise name@example.com)";
    }
    if (!phoneRegex.test(form.ownerPhone)) {
      errors.ownerPhone = "Sahi 10-digit mobile number daalo (6-9 se shuru)";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault();
    setError("");

    if (!validateDetails()) return;

    setLoading(true);

    try {
      // 1. Create auth user for this institute's owner
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.ownerEmail,
        password: form.password,
      });
      if (signUpError) throw signUpError;

      // 2. Upload logo if the institute provided one (optional — receipts
      //    fall back to showing just the institute name when this is empty)
      let logoUrl = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${form.slug}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("institute-logos")
          .upload(path, logoFile);
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("institute-logos")
            .getPublicUrl(path);
          logoUrl = publicUrlData.publicUrl;
        }
        // if upload fails, we don't block registration — just proceed without a logo
      }

      // 3. Create institute row — generate the id ourselves so we never
      //    need to SELECT it back (the new row isn't visible under RLS
      //    until step 4 links an admin to it)
      const instituteId = crypto.randomUUID();
      const isTrial = intent === "trial";
      const trialEndsAt = isTrial
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: instError } = await supabase
        .from("institutes")
        .insert({
          id: instituteId,
          name: form.name,
          slug: form.slug,
          owner_email: form.ownerEmail,
          owner_phone: form.ownerPhone,
          status: isTrial ? "active" : "pending",
          fee_paid: false,
          is_trial: isTrial,
          trial_ends_at: trialEndsAt,
          logo_url: logoUrl,
        });
      if (instError) throw instError;

      // 4. Link this user as institute admin
      const { error: adminError } = await supabase.from("institute_admins").insert({
        institute_id: instituteId,
        auth_user_id: signUpData.user.id,
        email: form.ownerEmail,
        full_name: form.name,
        role: "admin",
      });
      if (adminError) throw adminError;

      setInstituteId(instituteId);
      setStep(isTrial ? 3 : 2);
    } catch (err) {
      setError(err.message || "Kuch galat ho gaya, dobara try karo.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: payError } = await supabase.from("payments").insert({
        institute_id: instituteId,
        student_id: null,
        amount: REG_FEE,
        payment_mode: "upi",
        receipt_number: `REG-${Date.now()}`,
        remarks: `Registration fee — UTR: ${utr}`,
      });
      // ignore payments insert error silently if RLS blocks pre-approval; still move forward
      setStep(3);
    } catch (err) {
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  const upiLink = buildUpiLink(REG_FEE);

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6">
          <img src="/logo.png" alt="FeeMitra" className="h-16" />
        </Link>
        <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>
          FeeMitra me Register karo
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Apne coaching institute ko FeeMitra pe laao
        </p>

        {error && (
          <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: "#FBEAE6", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleDetailsSubmit}>
            <label className="block text-sm font-medium mb-1">Institute ka naam</label>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 mb-4"
              style={{ borderColor: "#E2E4EA" }}
              placeholder="e.g. Sharma Computer Classes"
            />

            <label className="block text-sm font-medium mb-1">
              URL slug (auto-generated)
            </label>
            <input
              name="slug"
              required
              value={form.slug}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
              style={{ borderColor: "#E2E4EA" }}
            />

            <label className="block text-sm font-medium mb-1">Aapka email</label>
            <input
              type="email"
              name="ownerEmail"
              required
              value={form.ownerEmail}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 mb-1"
              style={{ borderColor: fieldErrors.ownerEmail ? "var(--danger)" : "#E2E4EA" }}
              placeholder="name@example.com"
            />
            {fieldErrors.ownerEmail && (
              <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{fieldErrors.ownerEmail}</p>
            )}
            {!fieldErrors.ownerEmail && <div className="mb-4" />}

            <label className="block text-sm font-medium mb-1">Phone number</label>
            <input
              name="ownerPhone"
              required
              inputMode="numeric"
              maxLength={10}
              value={form.ownerPhone}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 mb-1"
              style={{ borderColor: fieldErrors.ownerPhone ? "var(--danger)" : "#E2E4EA" }}
              placeholder="10-digit mobile number"
            />
            {fieldErrors.ownerPhone && (
              <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{fieldErrors.ownerPhone}</p>
            )}
            {!fieldErrors.ownerPhone && <div className="mb-4" />}

            <label className="block text-sm font-medium mb-1">
              Institute ka logo (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="w-full text-sm mb-1"
            />
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Nahi hai to koi baat nahi — receipts pe sirf institute ka naam dikhega.
            </p>

            <label className="block text-sm font-medium mb-1">Password set karo</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 mb-6"
              style={{ borderColor: "#E2E4EA" }}
            />

            <button
              type="submit"
              disabled={loading}
              onClick={() => setIntent("pay")}
              className="w-full rounded-lg py-2.5 font-semibold text-white mb-3"
              style={{ background: "var(--navy)" }}
            >
              {loading && intent === "pay" ? "Register ho raha hai..." : `Register karo (₹${REG_FEE})`}
            </button>

            <button
              type="submit"
              disabled={loading}
              onClick={() => setIntent("trial")}
              className="w-full rounded-lg py-2.5 font-semibold"
              style={{ background: "#FFF3DA", color: "#946200" }}
            >
              {loading && intent === "trial" ? "Shuru ho raha hai..." : "3 Din Free Demo Try Karo"}
            </button>
            <p className="text-xs text-center mt-2" style={{ color: "var(--muted)" }}>
              Demo me turant access milega, koi payment nahi — 3 din baad renew karna hoga.
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handlePaymentSubmit}>
            <div className="text-center mb-4">
              <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
                Registration fee: <strong>₹{REG_FEE}</strong>
              </p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`}
                alt="UPI QR Code"
                className="mx-auto rounded-lg border"
                style={{ borderColor: "#E2E4EA" }}
              />
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                UPI ID: {UPI_ID}
              </p>
            </div>

            <label className="block text-sm font-medium mb-1">
              Payment ke baad UTR / Transaction ID daalo
            </label>
            <input
              required
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-6"
              style={{ borderColor: "#E2E4EA" }}
              placeholder="e.g. 234567891234"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 font-semibold text-white"
              style={{ background: "var(--navy)" }}
            >
              {loading ? "Submit ho raha hai..." : "Payment confirm karo"}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: "#E5F3EC", color: "var(--success)" }}
            >
              ✓
            </div>
            {intent === "trial" ? (
              <>
                <h2 className="font-display text-lg font-bold mb-2" style={{ color: "var(--navy)" }}>
                  Demo shuru ho gaya!
                </h2>
                <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                  3 din ke liye pura access mil gaya hai, koi payment nahi karni padi.
                  Turant login karke dashboard use kar sakte ho.
                </p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-2.5 rounded-lg font-semibold text-white"
                  style={{ background: "var(--navy)" }}
                >
                  Login karo
                </Link>
              </>
            ) : (
              <>
                <h2 className="font-display text-lg font-bold mb-2" style={{ color: "var(--navy)" }}>
                  Registration ho gaya!
                </h2>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Tumhara payment verify hone ke baad account approve ho jayega
                  (kuch ghanto me). Approval ke baad email pe pata chal jayega,
                  phir login kar sakte ho.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
