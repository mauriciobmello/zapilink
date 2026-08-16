"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Profile } from "@/types/profile";
import type { Permission, AccessCheck } from "@/types/access";

interface ProfileContextType {
  currentProfile: Profile | null;
  setCurrentProfile: (profile: Profile | null) => void;
  isOwner: boolean;
  isDelegate: boolean;
  permissions: Permission[];
  checkPermission: (permission: Permission) => boolean;
  role: "owner" | "delegate" | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
  initialProfile?: Profile | null;
  initialRole?: "owner" | "delegate" | null;
  initialPermissions?: Permission[];
}

export function ProfileProvider({
  children,
  initialProfile = null,
  initialRole = null,
  initialPermissions = [],
}: ProfileProviderProps) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(initialProfile);
  const [role, setRole] = useState<"owner" | "delegate" | null>(initialRole);
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);

  const isOwner = role === "owner";
  const isDelegate = role === "delegate";

  const checkPermission = (permission: Permission): boolean => {
    if (isOwner) return true;
    return permissions.includes(permission);
  };

  const updateProfileContext = (profile: Profile, accessInfo?: AccessCheck) => {
    setCurrentProfile(profile);
    if (accessInfo) {
      setRole(accessInfo.role || null);
      setPermissions(accessInfo.permissions || []);
    } else {
      // Se não houver info de acesso, assumir que é proprietário (fallback)
      setRole("owner");
      setPermissions([]);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        currentProfile,
        setCurrentProfile,
        isOwner,
        isDelegate,
        permissions,
        checkPermission,
        role,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

export function usePermission(permission: Permission): boolean {
  const { checkPermission } = useProfile();
  return checkPermission(permission);
}

export function usePermissions(): Permission[] {
  const { permissions } = useProfile();
  return permissions;
}
