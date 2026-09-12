"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation, Language } from "@/context/LanguageContext";

const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English (IN)" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

interface LanguageSelectorProps {
  direction?: "up" | "down";
  className?: string;
}

export default function LanguageSelector({
  direction = "up",
  className = "",
}: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div className={`verdra-lang-container ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="verdra-lang-btn"
        title="Change language / భాష మార్చండి / भाषा बदलें"
        aria-expanded={open}
        style={{
          display: "flex",
          width: "100%",
          minHeight: "40px",
          padding: "8px 12px",
          background: "#f1f6ef",
          border: "1px solid #dce6dc",
          borderRadius: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <Globe size={16} color="#2e7d32" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#12372a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeLang.nativeLabel}
          </span>
        </div>
        <ChevronDown
          size={14}
          color="#68756d"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {open && (
        <div
          className={`verdra-lang-dropdown ${direction}`}
          style={{
            position: "absolute",
            [direction === "up" ? "bottom" : "top"]: "calc(100% + 8px)",
            left: 0,
            width: "100%",
            minWidth: "195px",
            background: "#ffffff",
            border: "1px solid #dce6dc",
            borderRadius: "14px",
            padding: "6px",
            boxShadow: "0 14px 34px rgba(18, 55, 42, 0.12), 0 4px 10px rgba(18, 55, 42, 0.06)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            boxSizing: "border-box",
          }}
        >
          <div
            className="verdra-lang-header"
            style={{
              padding: "6px 10px 4px",
              fontSize: "9px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#68756d",
              borderBottom: "1px solid rgba(220, 230, 220, 0.6)",
              marginBottom: "2px",
            }}
          >
            Select Language
          </div>
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={`verdra-lang-item ${isSelected ? "active" : ""}`}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: isSelected ? "1px solid #c8e0c6" : "1px solid transparent",
                  background: isSelected ? "#eef6ec" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "left",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    className="verdra-lang-item-main"
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: isSelected ? "#2e7d32" : "#12372a",
                    }}
                  >
                    {lang.nativeLabel}
                  </span>
                  <span
                    className="verdra-lang-item-sub"
                    style={{
                      fontSize: "10px",
                      color: isSelected ? "#2e7d32" : "#68756d",
                    }}
                  >
                    {lang.label}
                  </span>
                </div>
                {isSelected && <Check size={16} color="#2e7d32" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
