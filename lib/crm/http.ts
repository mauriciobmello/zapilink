import { NextResponse } from "next/server";
import { CrmError } from "./server";

export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new CrmError("Corpo inválido.", 400);
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof CrmError) throw error;
    throw new CrmError("Corpo inválido.", 400);
  }
}

export function readString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

export function readOptionalString(
  body: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : null;
}

export function crmErrorResponse(error: unknown): NextResponse {
  if (error instanceof CrmError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message =
    error instanceof Error ? error.message : "Erro inesperado no servidor.";
  return NextResponse.json({ error: message }, { status: 500 });
}
