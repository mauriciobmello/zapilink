"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProfileListManager from "@/components/dashboard/ProfileListManager";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");

  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient();

    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        setUser(user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (!cancelled) {
          const userProfiles = (profileData ?? []) as Profile[];
          setProfiles(userProfiles);

          // Set current profile
          if (profileId) {
            const selected = userProfiles.find(p => p.id === profileId);
            if (selected) {
              setCurrentProfile(selected);
            } else if (userProfiles.length > 0) {
              setCurrentProfile(userProfiles[0]);
            }
          } else if (userProfiles.length > 0) {
            setCurrentProfile(userProfiles[0]);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        await securityLogger.error("Failed to load dashboard data", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  function handleProfileDeleted(deletedProfileId: string) {
    setProfiles(prev => prev.filter(p => p.id !== deletedProfileId));
    
    // Se o perfil excluído era o atual, selecionar outro
    if (currentProfile && deletedProfileId === currentProfile.id && profiles.length > 1) {
      const nextProfile = profiles.find(p => p.id !== deletedProfileId);
      if (nextProfile) {
        router.push(`/dashboard?profileId=${nextProfile.id}`);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-500">Você ainda não tem perfis.</p>
          <Link
            href="/api/profiles"
            className="mt-4 inline-block rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8B5CF6]"
          >
            Criar primeiro perfil
          </Link>
        </div>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/${currentProfile.username}`;

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-gray-100 bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {currentProfile.name || user?.email}!
        </h1>
        <p className="mt-2 text-gray-600">Sua página pública está em:</p>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-medium text-[#7C3AED] hover:underline"
        >
          {publicUrl}
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Primeira coluna: Dados da conta */}
        <div className="space-y-4">
          <div className="rounded-card border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Dados da Conta
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID do Usuário</p>
                <p className="font-mono text-sm text-gray-600">{user?.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data de Criação</p>
                <p className="text-sm text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Último Login</p>
                <p className="text-sm text-gray-900">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Visitantes hoje
            </h2>
            <p className="mt-2 text-gray-600">
              Estatísticas de visitantes chegam na Fase 2c (Analytics).
            </p>
            <span className="mt-4 inline-block text-sm text-gray-400">
              Em breve
            </span>
          </div>
        </div>

        {/* Segunda coluna: Lista de perfis */}
        <div>
          <ProfileListManager
            profiles={profiles}
            currentProfileId={currentProfile.id}
            onProfileDeleted={handleProfileDeleted}
          />
        </div>
      </div>
    </div>
  );
}
