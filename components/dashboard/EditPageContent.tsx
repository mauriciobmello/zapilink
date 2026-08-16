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

interface EditPageContentProps {
  profile: Profile;
  initialBlocks: Block[];
}

export default function EditPageContent({ profile, initialBlocks }: EditPageContentProps) {
  const searchParams = useSearchParams();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  
  const validTabs = ["perfil", "blocos", "links", "tema"] as const;
  const tab = validTabs.includes(searchParams.get("tab") as any) 
    ? (searchParams.get("tab") as typeof validTabs[number])
    : "perfil";
  
  const tabLink = (target: typeof validTabs[number]) =>
    `/dashboard/edit?tab=${target}&profileId=${profile.id}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_480px]">
      <div>
        <nav className="mb-6 flex gap-2" aria-label="Seções de edição">
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
        </nav>

        {tab === "blocos" ? (
          <BlockListEditor
            profileId={profile.id}
            profile={profile}
            initialBlocks={blocks}
            onBlocksChange={setBlocks}
          />
        ) : tab === "links" ? (
          <SocialLinksSection profile={profile} />
        ) : tab === "tema" ? (
          <ThemeSection profile={profile} />
        ) : (
          <ProfileForm initialData={profile} initialBlocks={blocks} />
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
