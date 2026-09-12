"use client";

import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  Trash2,
  X,
  Lock,
  ExternalLink,
  ShieldCheck,
  Clock,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface ExpertShareModalProps {
  scanId: string;
  scanData: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpertShareModal({
  scanId,
  scanData,
  isOpen,
  onClose,
}: ExpertShareModalProps) {
  const { t } = useTranslation();

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState("");
  const [revokedMessage, setRevokedMessage] = useState("");

  const handleGenerateShareLink = async () => {
    setIsGenerating(true);
    setError("");
    setRevokedMessage("");

    try {
      const res = await api.createShareLink(scanId, scanData);
      setShareToken(res.share_token);
      
      const fullUrl = `${window.location.origin}/share/${res.share_token}`;
      setShareUrl(fullUrl);
      setExpiresAt(res.expires_at);
    } catch (err: any) {
      setError(err.message || "Failed to generate expert share link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!shareToken) return;
    setIsRevoking(true);
    try {
      await api.revokeShareLink(shareToken);
      setShareUrl(null);
      setShareToken(null);
      setRevokedMessage("Case link has been revoked and is no longer accessible.");
    } catch (err: any) {
      setError(err.message || "Failed to revoke share link.");
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#0d1612] border border-[#2E7D32]/40 rounded-3xl p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 flex items-center justify-center text-[#52B788]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-heading">
                {t("share.title", "Expert Consultation Link")}
              </h3>
              <p className="text-[11px] text-[#8EA396]">
                Generate a secure, read-only link for an agricultural extension officer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security / Privacy Badge */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-2.5 text-xs text-[#8EA396]">
          <Lock className="w-4 h-4 text-[#52B788] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-white font-semibold">Zero Private Data Exposure</span>
            <p className="text-[11px] leading-relaxed">
              This link only grants access to this specific specimen diagnosis, Grad-CAM, and environmental risk. Farmer accounts, passwords, and other farm scans remain strictly private.
            </p>
          </div>
        </div>

        {/* Action Content */}
        {!shareUrl ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-xs text-neutral-300">
              The link will be protected with a cryptographically secure token and will automatically expire in 7 days.
            </p>

            <button
              type="button"
              onClick={handleGenerateShareLink}
              disabled={isGenerating}
              className="btn-forest !px-6 !py-3 !text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-[#2E7D32]/30 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Secure Link...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Generate Read-Only Link</span>
                </>
              )}
            </button>

            {revokedMessage && (
              <p className="text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40">
                {revokedMessage}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white font-mono uppercase">
                Active Expert Share URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-black/60 border border-[#2E7D32]/40 rounded-xl px-3 py-2 text-xs text-white font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-forest !px-4 !py-2 !text-xs flex items-center gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{t("share.copied", "Copied!")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t("share.copy", "Copy Link")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#8EA396] pt-1">
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#52B788]" />
                <span>Expires in 7 days</span>
              </div>

              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#52B788] hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Preview Public View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Revoke Control */}
            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isRevoking}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("share.revoke", "Revoke Link Immediately")}</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
