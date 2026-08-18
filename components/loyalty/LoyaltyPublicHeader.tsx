import Image from "next/image";
import Link from "next/link";
import type { ProfileTheme } from "@/lib/profileTheme";
import type { Profile } from "@/types/profile";

interface LoyaltyPublicHeaderProps {
  profile: Profile;
  theme: ProfileTheme;
  backHref: string;
  backLabel?: string;
}

/** Header das páginas públicas de fidelidade: logotipo do perfil, botão de voltar e barra de destaque. */
export default function LoyaltyPublicHeader({
  profile,
  theme,
  backHref,
  backLabel = "Voltar",
}: LoyaltyPublicHeaderProps) {
  const displayName = profile.name || profile.username;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <header className="bg-white shadow-card">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${profile.username}`} className="flex items-center gap-3">
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt={`Logotipo de ${displayName}`}
              width={80}
              height={80}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: theme.primary }}
            >
              {initials}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-900">
            {displayName}
          </span>
        </Link>

        <Link
          href={backHref}
          className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {backLabel}
        </Link>
      </div>
      <div className="h-1.5" style={{ backgroundColor: theme.accent }} />
    </header>
  );
}
