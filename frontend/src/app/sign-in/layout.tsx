import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Sage",
  description:
    "Sign in to Sage with your username and passcode to access your store workspace.",
};

export default function SignInLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full overflow-y-auto bg-muted">
      {children}
    </div>
  );
}
