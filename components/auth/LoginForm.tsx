"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { securityLogger } from "@/lib/security-logger";

interface LoginFormProps {
  onSuccess?: () => void;
  next?: string;
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email ou senha incorretos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Confirme seu email antes de entrar. Verifique sua caixa de entrada.";
  }
  return "Não foi possível entrar. Tente novamente.";
}

export default function LoginForm({ onSuccess, next = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      await securityLogger.warn("Login attempt failed", {
        email: email,
        error: error.message,
      });
      return;
    }

    await securityLogger.info("User logged in successfully", {
      email: email,
    });

    onSuccess?.();
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-card border border-gray-100 bg-white p-6 shadow-card"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-card border border-gray-200 px-4 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full rounded-card border border-gray-200 px-4 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-card bg-gradient-to-br from-[#7C3AED] to-[#F97316] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
