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

      await reloadAccessList();
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

  async function reloadAccessList() {
    const supabase = createBrowserClient();
    const { data: accessData } = await supabase
      .from("profile_access")
      .select(`
        *,
        profile_access_permissions (permission)
      `)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    setAccessList(accessData || []);
  }

  async function handleReactivate(accessId: string) {
    if (!confirm("Tem certeza que deseja reativar este acesso?")) {
      return;
    }

    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("profile_access")
        .update({
          status: "active",
          revoked_at: null,
        })
        .eq("id", accessId);

      if (error) throw error;

      await securityLogger.info("Admin access reactivated", { accessId });
      await reloadAccessList();
    } catch (err) {
      console.error("Error reactivating access:", err);
      alert("Erro ao reativar acesso");
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
      await reloadAccessList();
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
          <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Enviado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Permissões
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {accessList.map((access) => (
                  <tr key={access.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {access.invited_email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {access.invited_at
                        ? new Date(access.invited_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          access.status === "active"
                            ? "bg-green-100 text-green-700"
                            : access.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {access.status === "active"
                          ? "Ativo"
                          : access.status === "pending"
                          ? "Pendente"
                          : "Revogado"}
                      </span>
                      {access.accepted_at && (
                        <p className="mt-1 text-xs text-gray-400">
                          Aceito em {new Date(access.accepted_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {access.revoked_at && (
                        <p className="mt-1 text-xs text-gray-400">
                          Revogado em {new Date(access.revoked_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {access.profile_access_permissions?.map((perm: any) => (
                          <span
                            key={perm.permission}
                            className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700"
                          >
                            {perm.permission}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {access.status === "active" && (
                        <button
                          onClick={() => handleRevoke(access.id)}
                          className="rounded-card border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                        >
                          Revogar
                        </button>
                      )}
                      {access.status === "revoked" && (
                        <button
                          onClick={() => handleReactivate(access.id)}
                          className="rounded-card border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-100"
                        >
                          Reativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
