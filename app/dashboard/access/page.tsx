"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { securityLogger } from "@/lib/security-logger";
import { getAllPermissions } from "@/lib/access/permissions";
import type { Permission } from "@/types/access";

export const dynamic = "force-dynamic";

export default function AccessManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [accessList, setAccessList] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<Permission[]>([]);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availablePermissions = getAllPermissions();

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/auth/login");
          return;
        }

        if (!profileId) {
          setError("Selecione um perfil para gerenciar acessos");
          setLoading(false);
          return;
        }

        // Carregar perfil
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .single();

        if (!profileData) {
          setError("Perfil não encontrado");
          setLoading(false);
          return;
        }

        // Verificar se é proprietário
        if (profileData.user_id !== user.id) {
          setError("Você não é proprietário deste perfil");
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Carregar acessos
        const { data: accessData } = await supabase
          .from("profile_access")
          .select(`
            *,
            profile_access_permissions (permission)
          `)
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false });

        setAccessList(accessData || []);
        setLoading(false);
      } catch (err) {
        console.error("Error loading access data:", err);
        setError("Erro ao carregar dados");
        setLoading(false);
      }
    }

    loadData();
  }, [profileId, router]);

  async function handleInvite() {
    const supabase = createBrowserClient();
    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/access/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          email: inviteEmail,
          permissions: invitePermissions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar convite");
        setInviting(false);
        return;
      }

      await securityLogger.info("Admin invite created", {
        profileId,
        email: inviteEmail,
        permissions: invitePermissions,
      });

      // Recarregar lista
      const { data: accessData } = await supabase
        .from("profile_access")
        .select(`
          *,
          profile_access_permissions (permission)
        `)
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      setAccessList(accessData || []);
      setShowInviteModal(false);
      setInviteEmail("");
      setInvitePermissions([]);
      setSuccess(`Convite enviado com sucesso para ${inviteEmail}`);
      setInviting(false);
    } catch (err) {
      console.error("Error inviting admin:", err);
      setError("Erro ao criar convite");
      setInviting(false);
    }
  }

  async function handleRevoke(accessId: string) {
    if (!confirm("Tem certeza que deseja revogar este acesso?")) {
      return;
    }

    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("profile_access")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("id", accessId);

      if (error) throw error;

      await securityLogger.info("Admin access revoked", { accessId });

      // Recarregar lista
      const { data: accessData } = await supabase
        .from("profile_access")
        .select(`
          *,
          profile_access_permissions (permission)
        `)
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      setAccessList(accessData || []);
    } catch (err) {
      console.error("Error revoking access:", err);
      alert("Erro ao revogar acesso");
    }
  }

  function togglePermission(permission: Permission) {
    setInvitePermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8B5CF6]"
          >
            Voltar ao dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <button
        onClick={() => router.push(`/dashboard/edit?profileId=${profileId}`)}
        className="mb-4 inline-flex items-center gap-1 rounded-card border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
      >
        ← Voltar
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gerenciar Acessos
          </h1>
          <p className="mt-1 text-gray-600">
            {profile?.name || profile?.username}
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8B5CF6]"
        >
          + Adicionar administrador
        </button>
      </div>

      {success && (
        <div className="mb-4 rounded-card bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {error && !showInviteModal && (
        <div className="mb-4 rounded-card bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {accessList.length === 0 ? (
          <div className="rounded-card border border-gray-100 bg-white p-8 shadow-card text-center">
            <p className="text-gray-500">
              Nenhum administrador configurado para este perfil.
            </p>
          </div>
        ) : (
          accessList.map((access) => (
            <div
              key={access.id}
              className="rounded-card border border-gray-100 bg-white p-6 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {access.invited_email}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Status:{" "}
                    <span
                      className={`font-medium ${
                        access.status === "active"
                          ? "text-green-600"
                          : access.status === "pending"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {access.status === "active"
                        ? "Ativo"
                        : access.status === "pending"
                        ? "Pendente"
                        : "Revogado"}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {access.profile_access_permissions?.map((perm: any) => (
                      <span
                        key={perm.permission}
                        className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700"
                      >
                        {perm.permission}
                      </span>
                    ))}
                  </div>
                </div>
                {access.status === "active" && (
                  <button
                    onClick={() => handleRevoke(access.id)}
                    className="rounded-card border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    Revogar acesso
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="rounded-card border border-gray-100 bg-white p-6 shadow-card max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Adicionar administrador
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail do usuário
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="w-full rounded-card border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissões
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(availablePermissions).map(([key, perm]) => (
                    <label
                      key={key}
                      className="flex items-start gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={invitePermissions.includes(key as Permission)}
                        onChange={() => togglePermission(key as Permission)}
                        className="mt-1 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {perm.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {perm.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleInvite}
                disabled={inviting || invitePermissions.length === 0}
                className="flex-1 rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8B5CF6] disabled:opacity-50"
              >
                {inviting ? "Enviando..." : "Enviar convite"}
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInvitePermissions([]);
                  setError(null);
                }}
                disabled={inviting}
                className="flex-1 rounded-card border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
