import "./globals.css";

export const metadata = {
  title: "FeeMitra — Fee Management for Coaching Institutes",
  description: "Multi-tenant fee tracking and receipt system for coaching institutes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
