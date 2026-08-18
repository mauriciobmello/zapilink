import { notFound } from "next/navigation";
import LoyaltyProgramCard from "@/components/loyalty/LoyaltyProgramCard";
import LoyaltyPublicHeader from "@/components/loyalty/LoyaltyPublicHeader";
import { loadPublicLoyalty } from "@/lib/loyalty/publicPage";

export const dynamic = "force-dynamic";

export default async function LoyaltyPublicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const context = await loadPublicLoyalty(username);
  if (!context) notFound();

  const { profile, program, theme } = context;

  return (
    <main className="min-h-screen" style={theme.background}>
      <LoyaltyPublicHeader
        profile={profile}
        theme={theme}
        backHref={`/${username}`}
        backLabel="Voltar ao perfil"
      />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          Programa de Fidelidade
        </h1>

        <div className="mt-6">
          {program ? (
            <LoyaltyProgramCard
              username={username}
              program={program}
              primaryColor={theme.primary}
              accentColor={theme.accent}
            />
          ) : (
            <div className="rounded-card bg-white p-10 text-center shadow-card">
              <p className="text-gray-500">
                Este perfil ainda não ativou um programa de fidelidade.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
