import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Sage",
  description:
    "Sign in to Sage with your username and PIN to access your store workspace.",
};

export default function SignInLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full overflow-y-auto bg-neutral-100 dark:bg-neutral-950">
      {children}
    </div>
  );
}
