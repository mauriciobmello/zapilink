"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import type { Profile, SocialLink } from "@/types/profile";
import type { ProfileTheme } from "@/lib/profileTheme";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  LinkedInIcon,
  FacebookIcon,
  TwitterIcon,
  GitHubIcon,
  SiteIcon,
  EmailIcon,
  ShareIcon,
} from "@/components/icons";
import ShareModal from "./ShareModal";

const platformIcons: Record<string, ReactElement> = {
  instagram: <InstagramIcon className="h-5 w-5" />,
  tiktok: <TikTokIcon className="h-5 w-5" />,
  youtube: <YouTubeIcon className="h-5 w-5" />,
  linkedin: <LinkedInIcon className="h-5 w-5" />,
  facebook: <FacebookIcon className="h-5 w-5" />,
  twitter: <TwitterIcon className="h-5 w-5" />,
  github: <GitHubIcon className="h-5 w-5" />,
  site: <SiteIcon className="h-5 w-5" />,
  email: <EmailIcon className="h-5 w-5" />,
};

interface ProfileHeaderProps {
  profile: Profile;
  theme: ProfileTheme;
}

export default function ProfileHeader({
  profile,
  theme,
}: ProfileHeaderProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const displayName = profile.name || profile.username;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const socialLinks: SocialLink[] = profile.social_links ?? [];

  return (
    <>
      <header className="relative flex flex-col items-center text-center">
        {/* Share Icon Button */}
        <button
          onClick={() => setShowShareModal(true)}
          className="fixed right-[15px] top-[15px] z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-card transition-colors hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
          aria-label="Compartilhar perfil"
        >
          <ShareIcon className="h-5 w-5" />
        </button>

        <div className="relative w-full">
          {profile.cover_url ? (
            <div className="relative h-44 w-full sm:h-56">
              <Image
                src={profile.cover_url}
                alt={`Capa de ${displayName}`}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            </div>
          ) : (
            <div className="h-44 w-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-accent)] sm:h-56" />
          )}

          <div className="relative -mt-14 flex justify-center sm:-mt-16">
            <div className="rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-accent)] p-1.5 shadow-cardHover">
              {profile.photo_url ? (
                <Image
                  src={profile.photo_url}
                  alt={`Foto de perfil de ${displayName}`}
                  width={120}
                  height={120}
                  priority
                  className="h-24 w-24 rounded-full border-4 border-white object-cover sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white text-2xl font-bold text-[var(--theme-primary)] sm:h-28 sm:w-28">
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4">
          <h1 className="mt-5 text-3xl font-bold text-gray-900 sm:text-4xl">
            {displayName}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--theme-primary)]">
            @{profile.username}
          </p>
          {profile.description && (
            <div
              className="prose prose-sm mx-auto mt-3 max-w-2xl text-base text-gray-600"
              dangerouslySetInnerHTML={{ __html: profile.description }}
            />
          )}

          {socialLinks.length > 0 && (
            <nav aria-label="Redes sociais" className="mt-5 flex justify-center gap-3">
              {socialLinks.map((link) => (
                <a
                  key={`${link.platform}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.platform} de ${displayName}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-card transition-colors hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
                >
                  {platformIcons[link.platform] ?? (
                    <span className="text-xs font-bold uppercase">
                      {link.platform.charAt(0)}
                    </span>
                  )}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      <ShareModal
        profile={profile}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
}