import Link from "next/link";
import { notFound } from "next/navigation";
import LoyaltyRegisterForm from "@/components/loyalty/LoyaltyRegisterForm";
import { loadPublicLoyalty } from "@/lib/loyalty/publicPage";

export const dynamic = "force-dynamic";

export default async function LoyaltyRegisterPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const context = await loadPublicLoyalty(username);
  if (!context) notFound();

  const { program, theme } = context;

  return (
    <main className="min-h-screen" style={theme.background}>
      <div className="mx-auto max-w-lg px-4 py-10">
        {program ? (
          <LoyaltyRegisterForm
            username={username}
            programName={program.name}
            primaryColor={theme.primary}
          />
        ) : (
          <div className="rounded-card bg-white p-10 text-center shadow-card">
            <p className="text-gray-500">
              Este perfil ainda não ativou um programa de fidelidade.
            </p>
          </div>
        )}
        <p className="mt-6 text-center text-sm">
          <Link
            href={`/${username}/loyalty`}
            className="text-gray-500 hover:text-gray-700"
          >
            Voltar ao programa
          </Link>
        </p>
      </div>
    </main>
  );
}
