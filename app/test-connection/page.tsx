"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface TestDetails {
  envCheck?: {
    hasUrl: boolean;
    hasAnonKey: boolean;
    url: string;
    keyPrefix: string;
  };
  clientCreated?: boolean;
  session?: string;
  sessionError?: string;
  user?: string;
  userError?: string;
  userId?: string;
  dbConnection?: string;
  dbError?: string;
  error?: string;
}

export default function TestConnection() {
  const [status, setStatus] = useState("Inicializando...");
  const [details, setDetails] = useState<TestDetails>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        console.log("Iniciando teste de conexão...");
        
        // Teste 1: Verificar variáveis de ambiente
        const envCheck = {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || "NÃO DEFINIDO",
          keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
            ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + "..." 
            : "NÃO DEFINIDO"
        };
        
        console.log("Verificação de ambiente:", envCheck);
        setDetails((prev: TestDetails) => ({ ...prev, envCheck }));

        if (!envCheck.hasUrl || !envCheck.hasAnonKey) {
          setStatus("❌ VARIÁVEIS DE AMBIENTE FALTANDO");
          setLoading(false);
          return;
        }

        // Teste 2: Criar cliente Supabase
        const supabase = createBrowserClient();
        console.log("Cliente Supabase criado");
        setDetails((prev: TestDetails) => ({ ...prev, clientCreated: true }));

        // Teste 3: Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("Sessão atual:", session ? "EXISTS" : "NONE", sessionError);
        setDetails((prev: TestDetails) => ({ 
          ...prev, 
          session: session ? "EXISTS" : "NONE",
          sessionError: sessionError?.message
        }));

        // Teste 4: Verificar usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log("Usuário atual:", user ? "LOGGED_IN" : "NOT_LOGGED_IN", userError);
        setDetails((prev: TestDetails) => ({ 
          ...prev, 
          user: user ? "LOGGED_IN" : "NOT_LOGGED_IN",
          userError: userError?.message,
          userId: user?.id
        }));

        // Teste 5: Tentar conexão simples com banco
        const { data: profileTest, error: profileError } = await supabase
          .from("profiles")
          .select("count")
          .limit(1);
        
        console.log("Teste de banco:", profileTest, profileError);
        setDetails((prev: TestDetails) => ({ 
          ...prev, 
          dbConnection: profileError ? "FAILED" : "SUCCESS",
          dbError: profileError?.message
        }));

        if (profileError) {
          setStatus("❌ ERRO DE CONEXÃO COM BANCO");
        } else {
          setStatus("✅ CONEXÃO SUPABASE FUNCIONANDO");
        }

      } catch (error) {
        console.error("Erro no teste:", error);
        setStatus("❌ ERRO NO TESTE");
        setDetails((prev: TestDetails) => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : "Erro desconhecido"
        }));
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Teste de Conexão</h1>
          <p className="text-gray-600">{status}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Teste de Conexão Supabase</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Status: {status}</h2>
          
          {details && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Verificação de Ambiente:</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(details.envCheck, null, 2)}
                </pre>
              </div>

              {details.clientCreated && (
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-green-700">✅ Cliente Supabase criado com sucesso</p>
                </div>
              )}

              {details.session && (
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-blue-700">Sessão: {details.session}</p>
                  {details.sessionError && (
                    <p className="text-red-600 mt-2">Erro: {details.sessionError}</p>
                  )}
                </div>
              )}

              {details.user && (
                <div className="bg-purple-50 p-4 rounded">
                  <p className="text-purple-700">Usuário: {details.user}</p>
                  {details.userId && (
                    <p className="text-sm text-gray-600 mt-1">ID: {details.userId}</p>
                  )}
                  {details.userError && (
                    <p className="text-red-600 mt-2">Erro: {details.userError}</p>
                  )}
                </div>
              )}

              {details.dbConnection && (
                <div className={`p-4 rounded ${
                  details.dbConnection === "SUCCESS" 
                    ? "bg-green-50" 
                    : "bg-red-50"
                }`}>
                  <p className={
                    details.dbConnection === "SUCCESS"
                      ? "text-green-700"
                      : "text-red-700"
                  }>
                    Conexão Banco: {details.dbConnection}
                  </p>
                  {details.dbError && (
                    <p className="text-red-600 mt-2">Erro: {details.dbError}</p>
                  )}
                </div>
              )}

              {details.error && (
                <div className="bg-red-50 p-4 rounded">
                  <p className="text-red-700">Erro: {details.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🔍 Como Usar Este Teste</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Acesse: <code className="bg-gray-200 px-2 py-1 rounded">/test-connection</code></li>
            <li>Verifique o status acima</li>
            <li>Abra o console do navegador (F12) para ver logs detalhados</li>
            <li>Se mostrar "VARIÁVEIS FALTANDO", configure no Dokploy</li>
            <li>Se mostrar "ERRO DE CONEXÃO", verifique as chaves Supabase</li>
          </ol>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">📋 Checklist de Variáveis Dokploy</h2>
          <ul className="space-y-2 text-gray-700">
            <li>☐ NEXT_PUBLIC_SUPABASE_URL configurada?</li>
            <li>☐ NEXT_PUBLIC_SUPABASE_ANON_KEY configurada?</li>
            <li>☐ SUPABASE_SERVICE_ROLE_KEY configurada?</li>
            <li>☐ NEXT_PUBLIC_SITE_URL configurada?</li>
            <li>☐ Chaves copiadas corretamente do Supabase Dashboard?</li>
            <li>☐ Redeploy feito após configurar variáveis?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}