"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/shared/AuthGuard";
import Logo from "@/components/shared/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";
import ProfileSwitcher from "@/components/dashboard/ProfileSwitcher";

const MODULE_LINKS = [
  { href: "/dashboard", label: "Visão Geral", module: null },
  { href: "/dashboard/edit", label: "Editar Perfil", module: "edit" },
  { href: "/dashboard/schedule", label: "Agenda", module: "schedule" },
  { href: "/dashboard/loyalty", label: "Fidelidade", module: "loyalty" },
  { href: "/dashboard/crm", label: "CRM", module: "crm" },
  { href: "/dashboard/preview", label: "Preview", module: null },
];

function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");
  const [enabled, setEnabled] = useState<string[]>([]);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/profiles/${profileId}/modules`)
      .then((res) => res.json())
      .then((data) => setEnabled(data.enabled ?? []))
      .catch(() => setEnabled([]));
  }, [profileId]);

  const navLinks = MODULE_LINKS.filter(
    (link) => !link.module || enabled.includes(link.module),
  );

  const navHref = (href: string) =>
    profileId ? `${href}?profileId=${encodeURIComponent(profileId)}` : href;

  // Only show navigation links and profile switcher on edit/schedule/preview pages, not on main dashboard
  const showNavElements = pathname === "/dashboard/edit" ||
                          pathname === "/dashboard/schedule" ||
                          pathname === "/dashboard/preview" ||
                          pathname.startsWith("/dashboard/loyalty") ||
                          pathname.startsWith("/dashboard/crm") ||
                          pathname.startsWith("/dashboard/settings");

  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/dashboard" aria-label="ZAPILINK">
          <Logo height={30} priority />
        </Link>
        {showNavElements && (
          <div className="flex flex-wrap items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={navHref(link.href)}
                className={`rounded-card px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href ||
                  (link.href !== "/dashboard" &&
                    pathname.startsWith(`${link.href}/`))
                    ? "bg-[#7C3AED] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {showNavElements && <ProfileSwitcher />}
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-page">
        <Suspense fallback={null}>
          <DashboardNav />
        </Suspense>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}