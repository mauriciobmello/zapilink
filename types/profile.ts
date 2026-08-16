import type { Block } from "@/types/block";
import type { Permission } from "@/types/access";

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ProfileAccessInfo {
  role: "owner" | "delegate";
  permissions: Permission[];
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  name: string | null;
  description: string | null;
  photo_url: string | null;
  theme_color: string | null;
  theme_accent: string | null;
  social_links: SocialLink[];
  updated_at: string | null;
  blocks?: Block[];
  access?: ProfileAccessInfo;
}