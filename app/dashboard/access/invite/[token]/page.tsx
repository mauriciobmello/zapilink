"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    async function loadInviteDetails() {
      const supabase = createBrowserClient();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Redirecionar para login com o token para voltar depois
          router.push(`/auth/login?redirect=/dashboard/access/invite/${token}`);
          return;
        }

        // Em um sistema real, você validaria o token aqui
        // Por enquanto, vamos simular a busca pelo convite pendente do usuário
        const { data: access } = await supabase
          .from("profile_access")
          .select(`
            *,
            profiles (name, username)
          `)
          .eq("grantee_user_id", user.id)
          .eq("status", "pending")
          .single();

        if (!access) {
          setError("Convite não encontrado ou inválido");
          setLoading(false);
          return;
        }

        setProfileName(access.profiles?.name || access.profiles?.username);
        setOwnerName(access.invited_email); // Usar o email convidado

        // Buscar permissões
        const { data: permissionsData } = await supabase
          .from("profile_access_permissions")
          .select("permission")
          .eq("profile_access_id", access.id);

        setPermissions(permissionsData?.map((p: any) => p.permission) || []);
        setLoading(false);
      } catch (err) {
        console.error("Error loading invite:", err);
        setError("Erro ao carregar convite");
        setLoading(false);
      }
    }

    loadInviteDetails();
  }, [token, router]);

  async function handleAccept() {
    const supabase = createBrowserClient();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Você precisa estar autenticado");
        setLoading(false);
        return;
      }

      // Aceitar o convite
      const { error } = await supabase
        .from("profile_access")
        .update({
          status: "active",
          accepted_at: new Date().toISOString(),
        })
        .eq("grantee_user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      await securityLogger.info("Access invite accepted", {
        userId: user.id,
        token,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("Erro ao aceitar convite");
      setLoading(false);
    }
  }

  async function handleDecline() {
    const supabase = createBrowserClient();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Recusar o convite (revogar)
      const { error } = await supabase
        .from("profile_access")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("grantee_user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      await securityLogger.info("Access invite declined", {
        userId: user.id,
        token,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Error declining invite:", err);
      setError("Erro ao recusar convite");
      setLoading(false);
    }
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
    <div className="max-w-2xl mx-auto py-12">
      <div className="rounded-card border border-gray-100 bg-white p-8 shadow-card">
        <h1 className="text-2xl font-bold text-gray-900">
          Convite para administrar perfil
        </h1>
        
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Perfil</p>
            <p className="font-medium text-gray-900">{profileName}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Proprietário</p>
            <p className="font-medium text-gray-900">{ownerName}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Permissões concedidas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8B5CF6] disabled:opacity-50"
          >
            Aceitar convite
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            className="flex-1 rounded-card border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
      </div>
    </div>
  );
}
