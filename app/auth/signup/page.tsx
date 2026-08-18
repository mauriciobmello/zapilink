import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";
import Logo from "@/components/shared/Logo";

export const metadata: Metadata = {
  title: "Criar conta — ZAPILINK",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-page px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" aria-label="ZAPILINK" className="mb-6 inline-block">
            <Logo height={34} priority />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Criar sua conta</h1>
          <p className="mt-2 text-sm text-gray-600">
            Leva menos de um minuto.
          </p>
        </div>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-gray-600">
          Já tem uma conta?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-[#7C3AED] hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
