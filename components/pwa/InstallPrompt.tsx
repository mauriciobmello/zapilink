"use client";

import { useEffect, useState } from "react";
import { CopyIcon, XIcon } from "@/components/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other";

function getPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

function CopyLinkButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/${username}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-200"
    >
      <CopyIcon className="h-4 w-4" />
      {copied ? "Link copiado!" : "Copiar link do app"}
    </button>
  );
}

interface InstallPromptProps {
  appName?: string;
  photoUrl?: string;
  themeColor?: string;
  username?: string;
}

export default function InstallPrompt({
  appName = "Zapilink",
  photoUrl,
  themeColor = "#6200b2",
  username = "",
}: InstallPromptProps) {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    setPlatform(getPlatform());

    if (getPlatform() === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener(
        "beforeinstallprompt",
        handler as EventListener,
      );
      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handler as EventListener,
        );
      };
    }

    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedAt) {
      const hoursSince =
        (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    if (getPlatform() === "ios" || getPlatform() === "other") {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (deferredPrompt) setShow(true);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(
      "pwa-prompt-dismissed",
      String(Date.now()),
    );
  };

  const handleInstall = async () => {
    if (platform === "android" && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleDismiss}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Instalar ${appName}`}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 text-center shadow-2xl"
      >
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Fechar"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
          style={{ backgroundColor: themeColor }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
                alt={appName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-white">Z</span>
          )}
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Instalar {appName}
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Adicione esta página à tela inicial para acessar como um app.
        </p>

        {platform === "ios" && (
          <div className="mb-6 rounded-xl bg-gray-50 p-4 text-left text-sm text-gray-700">
            <p className="mb-4">
              Para adicionar esse app na sua Tela inicial, abra esse link no
              seu navegador.
            </p>
            <CopyLinkButton username={username} />
          </div>
        )}

        {platform === "other" && (
          <div className="mb-6 rounded-xl bg-gray-50 p-4 text-left text-sm text-gray-700">
            <p>
              Use o menu do navegador e selecione{" "}
              <strong>Adicionar à tela inicial</strong> ou{" "}
              <strong>Instalar aplicativo</strong>.
            </p>
          </div>
        )}

        {platform === "android" && !deferredPrompt && (
          <div className="mb-6 rounded-xl bg-gray-50 p-4 text-left text-sm text-gray-700">
            <p>
              Toque no menu do Chrome e selecione{" "}
              <strong>Adicionar à tela inicial</strong>.
            </p>
          </div>
        )}

        {platform === "android" && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mb-4 w-full rounded-xl bg-[#6200b2] px-4 py-3 font-semibold text-white shadow transition hover:brightness-110"
          >
            Adicionar à tela inicial
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
