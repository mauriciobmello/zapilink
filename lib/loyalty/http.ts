import { NextResponse } from "next/server";
import { LoyaltyError } from "./server";

export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new LoyaltyError("Corpo inválido.", 400);
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof LoyaltyError) throw error;
    throw new LoyaltyError("Corpo inválido.", 400);
  }
}

export function readString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

export function loyaltyErrorResponse(error: unknown): NextResponse {
  if (error instanceof LoyaltyError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message =
    error instanceof Error ? error.message : "Erro inesperado no servidor.";
  return NextResponse.json({ error: message }, { status: 500 });
}
