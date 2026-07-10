import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organization — Sage",
  description:
    "Create staff accounts, reset PINs, and manage organization access for your store.",
};

export default function OrganizationLayout({
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
