import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gradient-page">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="text-xl font-bold text-[#7C3AED]">ZAPILINK</span>
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8B5CF6]"
            >
              Meu painel
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Entrar
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8B5CF6]"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-4 pb-24 pt-16 text-center sm:pt-20">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Todos os seus links, vendas e agendamentos em{" "}
          <span className="bg-gradient-to-r from-[#7C3AED] to-[#F97316] bg-clip-text text-transparent">
            um único lugar
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          Crie sua página personalizada com links, serviços, agendamentos e
          pagamentos. Sem código, sem complicação.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/auth/signup"
            className="h-12 rounded-card bg-gradient-to-br from-[#7C3AED] to-[#F97316] px-8 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Criar minha página grátis
          </Link>
        </div>
      </section>
    </main>
  );
}
