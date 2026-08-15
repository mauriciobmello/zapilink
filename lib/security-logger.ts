interface SecurityLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "critical";
  event: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

class SecurityLogger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private formatLog(entry: SecurityLogEntry): string {
    const { timestamp, level, event, userId, ipAddress, details } = entry;
    const userIdStr = userId ? ` [User: ${userId}]` : "";
    const ipStr = ipAddress ? ` [IP: ${ipAddress}]` : "";
    const detailsStr = details ? ` ${JSON.stringify(details)}` : "";
    return `[${timestamp}] ${level.toUpperCase()} SECURITY: ${event}${userIdStr}${ipStr}${detailsStr}`;
  }

  private async getIpFromHeaders(): Promise<string | undefined> {
    try {
      const headers = await import("next/headers").then((m) => m.headers());
      const headersList = await headers;
      return (
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        undefined
      );
    } catch {
      return undefined;
    }
  }

  private async getUserAgent(): Promise<string | undefined> {
    try {
      const headers = await import("next/headers").then((m) => m.headers());
      const headersList = await headers;
      return headersList.get("user-agent") || undefined;
    } catch {
      return undefined;
    }
  }

  private async log(entry: SecurityLogEntry): Promise<void> {
    const formattedLog = this.formatLog(entry);

    if (this.isDevelopment) {
      console.log(formattedLog);
    }

    // Em produção, você pode enviar para um serviço de logging externo
    // como Sentry, LogRocket, Datadog, etc.
    // if (!this.isDevelopment) {
    //   await this.sendToExternalService(entry);
    // }
  }

  private async createEntry(
    level: SecurityLogEntry["level"],
    event: string,
    details?: Record<string, unknown>,
    userId?: string
  ): Promise<SecurityLogEntry> {
    const [ipAddress, userAgent] = await Promise.all([
      this.getIpFromHeaders(),
      this.getUserAgent(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      level,
      event,
      userId,
      ipAddress,
      userAgent,
      details,
    };
  }

  async info(
    event: string,
    details?: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    const entry = await this.createEntry("info", event, details, userId);
    await this.log(entry);
  }

  async warn(
    event: string,
    details?: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    const entry = await this.createEntry("warn", event, details, userId);
    await this.log(entry);
  }

  async error(
    event: string,
    details?: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    const entry = await this.createEntry("error", event, details, userId);
    await this.log(entry);
  }

  async critical(
    event: string,
    details?: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    const entry = await this.createEntry("critical", event, details, userId);
    await this.log(entry);
  }
}

export const securityLogger = new SecurityLogger();
