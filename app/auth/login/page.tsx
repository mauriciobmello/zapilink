import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Entrar — ZAPILINK",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-page px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Entrar na sua conta
          </h1>
          <p className="mt-2 text-sm text-gray-600">Bem-vindo de volta!</p>
        </div>
        <LoginForm next={params.next ?? "/dashboard"} />
        <p className="mt-4 text-center text-sm text-gray-600">
          Novo por aqui?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-[#7C3AED] hover:underline"
          >
            Crie sua conta
          </Link>
        </p>
      </div>
    </main>
  );
}
