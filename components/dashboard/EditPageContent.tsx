"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Block } from "@/types/block";
import type { Profile } from "@/types/profile";
import ProfileForm from "@/components/dashboard/ProfileForm";
import BlockListEditor from "@/components/dashboard/blocks/BlockListEditor";
import SocialLinksSection from "@/components/dashboard/SocialLinksSection";
import ThemeSection from "@/components/dashboard/ThemeSection";
import PreviewPane from "@/components/dashboard/PreviewPane";
import { useProfile } from "@/contexts/ProfileContext";

interface EditPageContentProps {
  profile: Profile;
  initialBlocks: Block[];
}

export default function EditPageContent({ profile, initialBlocks }: EditPageContentProps) {
  const searchParams = useSearchParams();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const { checkPermission, isOwner } = useProfile();
  
  // Determinar quais abas são permitidas
  const canViewProfile = checkPermission("profile.view");
  const canEditProfile = checkPermission("profile.edit");
  const canViewBlocks = checkPermission("blocks.view");
  const canEditBlocks = checkPermission("blocks.edit");
  const canEditSocial = checkPermission("social_links.edit");
  const canEditTheme = checkPermission("theme.edit");

  const validTabs = ["perfil", "blocos", "links", "tema"] as const;
  const currentTab = searchParams.get("tab") ?? "perfil";
  const tab = validTabs.includes(currentTab as any)
    ? (currentTab as typeof validTabs[number])
    : "perfil";
  
  const tabLink = (target: typeof validTabs[number]) =>
    `/dashboard/edit?tab=${target}&profileId=${profile.id}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_480px]">
      <div>
        <nav className="mb-6 flex gap-2" aria-label="Seções de edição">
          {canViewProfile && (
            <Link
              href={tabLink("perfil")}
              className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
                tab === "perfil"
                  ? "bg-[#7C3AED] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Perfil
            </Link>
          )}
          {canViewBlocks && (
            <Link
              href={tabLink("blocos")}
              className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
                tab === "blocos"
                  ? "bg-[#7C3AED] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Blocos
            </Link>
          )}
          {canEditSocial && (
            <Link
              href={tabLink("links")}
              className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
                tab === "links"
                  ? "bg-[#7C3AED] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Links sociais
            </Link>
          )}
          {canEditTheme && (
            <Link
              href={tabLink("tema")}
              className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
                tab === "tema"
                  ? "bg-[#7C3AED] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tema
            </Link>
          )}
        </nav>

        {tab === "blocos" ? (
          <BlockListEditor
            profileId={profile.id}
            profile={profile}
            initialBlocks={blocks}
            onBlocksChange={setBlocks}
            canEdit={canEditBlocks}
          />
        ) : tab === "links" ? (
          <SocialLinksSection profile={profile} canEdit={canEditSocial} />
        ) : tab === "tema" ? (
          <ThemeSection profile={profile} canEdit={canEditTheme} />
        ) : (
          <ProfileForm 
            initialData={profile} 
            initialBlocks={blocks} 
            canEdit={canEditProfile}
          />
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-8">
          <PreviewPane profile={profile} blocks={blocks} />
        </div>
      </aside>
    </div>
  );
}
