import Link from "next/link";

const features = [
  {
    title: "Instant Fee Receipts",
    desc: "Generate professional, downloadable fee receipts for every student payment in one click.",
    icon: "📄",
  },
  {
    title: "Student Fee Tracking",
    desc: "See who has paid, who is due, and payment history — all in one clean dashboard.",
    icon: "📊",
  },
  {
    title: "Multi-Institute Ready",
    desc: "Manage one branch or many. Each institute gets its own secure, private dashboard.",
    icon: "🏫",
  },
  {
    title: "Simple UPI Payments",
    desc: "Students and institutes pay easily via UPI — no complicated setup required.",
    icon: "💳",
  },
];

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen overflow-hidden">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <span className="font-display text-xl font-extrabold" style={{ color: "var(--navy)" }}>
          FeeMitra
        </span>
        <Link
          href="/login"
          className="text-sm font-semibold px-4 py-2 rounded-lg"
          style={{ color: "var(--navy)" }}
        >
          Login
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 text-center">
        <div
          className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6 animate-fade-in-up"
          style={{ background: "#FFF3DA", color: "#946200" }}
        >
          Built for Coaching Institutes Across India
        </div>

        <h1
          className="font-display text-4xl sm:text-5xl font-extrabold mb-5 leading-tight animate-fade-in-up stagger-1"
          style={{ color: "var(--navy)" }}
        >
          Fee Management,
          <br />
          <span style={{ color: "var(--gold)" }}>Simplified.</span>
        </h1>

        <p
          className="text-base sm:text-lg max-w-xl mx-auto mb-8 animate-fade-in-up stagger-2"
          style={{ color: "var(--muted)" }}
        >
          FeeMitra helps coaching institutes track student fees, generate
          receipts, and manage everything from one simple dashboard —
          built for the way local institutes actually work.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up stagger-3">
          <Link
            href="/register"
            className="px-7 py-3 rounded-xl font-semibold text-white shadow-lg"
            style={{ background: "var(--navy)" }}
          >
            Register Your Institute
          </Link>
          <Link
            href="/login"
            className="px-7 py-3 rounded-xl font-semibold border"
            style={{ borderColor: "#D8DAE3", color: "var(--navy)" }}
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-14 animate-float">
          <div
            className="max-w-md mx-auto rounded-2xl shadow-xl p-6 text-left"
            style={{ background: "white", border: "1px solid #EEF0F4" }}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>
                Fee Receipt
              </span>
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: "#E5F3EC", color: "var(--success)" }}
              >
                Paid
              </span>
            </div>
            <div className="h-2 rounded-full w-3/4 mb-2" style={{ background: "#EEF0F4" }} />
            <div className="h-2 rounded-full w-1/2 mb-4" style={{ background: "#EEF0F4" }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>Amount</span>
              <span className="font-bold" style={{ color: "var(--navy)" }}>₹5,000</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2
          className="font-display text-2xl font-bold text-center mb-10"
          style={{ color: "var(--navy)" }}
        >
          Everything your institute needs
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`card-hover bg-white rounded-2xl p-6 shadow-sm animate-fade-in-up stagger-${(i % 4) + 1}`}
              style={{ border: "1px solid #EEF0F4" }}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display font-bold mb-2" style={{ color: "var(--navy)" }}>
                {f.title}
              </h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div
          className="rounded-2xl p-10"
          style={{ background: "var(--navy)" }}
        >
          <h2 className="font-display text-2xl font-bold text-white mb-3">
            Ready to simplify your institute&apos;s fee management?
          </h2>
          <p className="text-sm mb-6" style={{ color: "#B9C0D4" }}>
            Get started in a few minutes. No technical setup needed.
          </p>
          <Link
            href="/register"
            className="inline-block px-7 py-3 rounded-xl font-semibold"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
          >
            Register Your Institute →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-10 text-xs" style={{ color: "var(--muted)" }}>
        © {new Date().getFullYear()} FeeMitra. Built for coaching institutes.
      </footer>
    </div>
  );
}
