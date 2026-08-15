"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { securityLogger } from "@/lib/security-logger";

interface SignupFormProps {
  onSuccess?: () => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      await securityLogger.warn("Signup attempt failed", {
        email: email,
        error: error.message,
      });
      return;
    }

    await securityLogger.info("User signed up successfully", {
      email: email,
      hasSession: !!data.session,
    });

    onSuccess?.();

    if (data.session) {
      router.push("/dashboard/edit");
      router.refresh();
    } else {
      setMessage(
        "Conta criada! Enviamos um link de confirmação para o seu email. Confirme para ativar sua conta.",
      );
    }
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full rounded-card border border-gray-200 px-4 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
        />
        <p className="mt-1 text-xs text-gray-400">
          No mínimo 8 caracteres.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Confirmar senha
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-12 w-full rounded-card border border-gray-200 px-4 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-card bg-gradient-to-br from-[#7C3AED] to-[#F97316] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}