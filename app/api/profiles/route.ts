import { NextResponse } from "next/server";
import { createProfile, requireUser } from "@/lib/auth";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export async function POST(request: Request) {
  const user = await requireUser();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  if (!USERNAME_REGEX.test(username)) {
    await securityLogger.warn("Invalid username format", {
      userId: user.id,
      username: username,
    });
    return NextResponse.json(
      { error: "O username deve ter 3-30 caracteres (letras, números e _)." },
      { status: 400 },
    );
  }

  try {
    const profile = await createProfile(user.id, username);
    await securityLogger.info("Profile created successfully", {
      userId: user.id,
      profileId: profile.id,
      username: profile.username,
    });
    return NextResponse.json({ id: profile.id, username: profile.username });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate") || message.includes("23505")) {
      await securityLogger.warn("Username already taken", {
        userId: user.id,
        username: username,
      });
      return NextResponse.json(
        { error: "Este username já está em uso." },
        { status: 409 },
      );
    }
    await securityLogger.error("Profile creation failed", {
      userId: user.id,
      username: username,
      error: message,
    });
    return NextResponse.json(
      { error: message || "Não foi possível criar o perfil." },
      { status: 500 },
    );
  }
}