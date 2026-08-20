"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProfileListManager from "@/components/dashboard/ProfileListManager";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";
import { securityLogger } from "@/lib/security-logger";
import { getAccessibleProfiles } from "@/lib/access/authorization";
import { ProfileProvider } from "@/contexts/ProfileContext";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");

  const [user, setUser] = useState<any>(null);
  const [ownedProfiles, setOwnedProfiles] = useState<Profile[]>([]);
  const [delegatedProfiles, setDelegatedProfiles] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [currentProfileAccess, setCurrentProfileAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient();

    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        setUser(user);

        // Obter perfis acessíveis (próprios e delegados) via API
        const res = await fetch("/api/profiles/accessible");
        const accessible: { owned: Profile[]; delegated: any[] } = await res.json();
        
        if (!cancelled) {
          setOwnedProfiles(accessible.owned);
          setDelegatedProfiles(accessible.delegated);

          const allProfiles = [...accessible.owned, ...accessible.delegated];

          // Set current profile
          if (profileId) {
            const selected = allProfiles.find(p => p.id === profileId);
            if (selected) {
              setCurrentProfile(selected);
              // Se for delegado, obter informações de acesso
              const delegated = accessible.delegated.find(p => p.id === profileId);
              setCurrentProfileAccess(delegated?.access || null);
            } else if (allProfiles.length > 0) {
              setCurrentProfile(allProfiles[0]);
            }
          } else if (allProfiles.length > 0) {
            setCurrentProfile(allProfiles[0]);
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
    setOwnedProfiles(prev => prev.filter(p => p.id !== deletedProfileId));
    setDelegatedProfiles(prev => prev.filter(p => p.id !== deletedProfileId));
    
    // Se o perfil excluído era o atual, selecionar outro
    const allProfiles = [...ownedProfiles, ...delegatedProfiles];
    if (currentProfile && deletedProfileId === currentProfile.id && allProfiles.length > 1) {
      const nextProfile = allProfiles.find(p => p.id !== deletedProfileId);
      if (nextProfile) {
        router.push(`/dashboard?profileId=${nextProfile.id}`);
      }
    }
  }

  function handleProfileSelect(profile: Profile, accessInfo?: any) {
    setCurrentProfile(profile);
    setCurrentProfileAccess(accessInfo || null);
    // Se não houver info de acesso, assumir que é proprietário (fallback)
    if (!accessInfo) {
      // O provider irá definir role como "owner" automaticamente
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const allProfiles = [...ownedProfiles, ...delegatedProfiles];

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
  const isDelegated = delegatedProfiles.some(p => p.id === currentProfile.id);
  const role = isDelegated ? "delegate" : "owner";
  const permissions = currentProfileAccess?.permissions || [];

  return (
    <ProfileProvider
      initialProfile={currentProfile}
      initialRole={role}
      initialPermissions={permissions}
    >
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
          {!isDelegated && (
            <Link
              href={`/dashboard/settings/modules?profileId=${encodeURIComponent(currentProfile.id)}`}
              className="mt-4 inline-flex items-center rounded-card border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Habilitar módulos
            </Link>
          )}
          {isDelegated && (
            <div className="mt-4 rounded-card bg-blue-50 p-3 text-sm text-blue-700">
              <p className="font-medium">Você está administrando esta página</p>
              <p className="text-xs mt-1">Proprietário: {currentProfileAccess?.owner_user_id}</p>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[30%_1fr]">
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
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Minhas páginas
              </h2>
              {ownedProfiles.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma página própria</p>
              ) : (
                <ProfileListManager
                  profiles={ownedProfiles}
                  currentProfileId={currentProfile.id}
                  onProfileDeleted={handleProfileDeleted}
                  onProfileSelect={handleProfileSelect}
                />
              )}
            </div>

            {delegatedProfiles.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Páginas que administro
                </h2>
                <ProfileListManager
                  profiles={delegatedProfiles}
                  currentProfileId={currentProfile.id}
                  onProfileDeleted={handleProfileDeleted}
                  onProfileSelect={handleProfileSelect}
                  showOwnerInfo={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfileProvider>
  );
}
