"use client";

import { useState } from "react";
import Image from "next/image";
import type { Profile } from "@/types/profile";
import { ShareIcon, InstagramIcon, FacebookIcon, TwitterIcon, WhatsAppIcon, LinkedInIcon } from "@/components/icons";

interface ShareModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ profile, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const profileUrl = typeof window !== 'undefined' ? window.location.origin + '/' + profile.username : '';

  const displayName = profile.name || profile.username;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToSocial = (platform: string) => {
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=Confira%20o%20perfil%20de%20${encodeURIComponent(displayName)}&url=${encodeURIComponent(profileUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
      whatsapp: `https://wa.me/?text=Confira%20o%20perfil%20de%20${encodeURIComponent(displayName)}%3A%20${encodeURIComponent(profileUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
    };

    const url = shareUrls[platform];
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-card bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Compartilhar perfil</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile Card */}
        <div className="mb-6 rounded-card border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gradient-to-br from-purple-500 to-orange-500 p-1">
              {profile.photo_url ? (
                <Image
                  src={profile.photo_url}
                  alt={`Foto de perfil de ${displayName}`}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full border-2 border-white object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white text-xl font-bold text-purple-600">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{displayName}</h3>
              <p className="text-sm text-gray-600">@{profile.username}</p>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="mb-6">
          <button
            onClick={copyToClipboard}
            className="mb-3 flex w-full items-center gap-3 rounded-card border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <ShareIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {copied ? 'Copiado!' : 'Copiar link'}
              </p>
              <p className="text-xs text-gray-500">{profileUrl}</p>
            </div>
          </button>

          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => shareToSocial('twitter')}
              className="flex flex-col items-center gap-2 rounded-card border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
              aria-label="Compartilhar no Twitter"
            >
              <TwitterIcon className="h-6 w-6 text-gray-700" />
              <span className="text-xs text-gray-600">X</span>
            </button>

            <button
              onClick={() => shareToSocial('facebook')}
              className="flex flex-col items-center gap-2 rounded-card border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
              aria-label="Compartilhar no Facebook"
            >
              <FacebookIcon className="h-6 w-6 text-blue-600" />
              <span className="text-xs text-gray-600">Facebook</span>
            </button>

            <button
              onClick={() => shareToSocial('whatsapp')}
              className="flex flex-col items-center gap-2 rounded-card border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
              aria-label="Compartilhar no WhatsApp"
            >
              <WhatsAppIcon className="h-6 w-6 text-green-600" />
              <span className="text-xs text-gray-600">WhatsApp</span>
            </button>

            <button
              onClick={() => shareToSocial('linkedin')}
              className="flex flex-col items-center gap-2 rounded-card border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
              aria-label="Compartilhar no LinkedIn"
            >
              <LinkedInIcon className="h-6 w-6 text-blue-700" />
              <span className="text-xs text-gray-600">LinkedIn</span>
            </button>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 rounded-card border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Saiba mais
          </a>
          <a
            href="/auth/signup"
            className="flex-1 rounded-card bg-gradient-to-br from-purple-600 to-orange-500 px-4 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Cadastre-se gratuitamente
          </a>
        </div>
      </div>
    </div>
  );
}
