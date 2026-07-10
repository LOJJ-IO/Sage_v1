import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage team — Sage",
  description:
    "Create staff accounts, reset PINs, and manage team access for your store.",
};

export default function ManageTeamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full overflow-y-auto bg-neutral-100">
      {children}
    </div>
  );
}
