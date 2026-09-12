"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation, Language } from "@/context/LanguageContext";

const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
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
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const activeLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleSelectLanguage = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div
      className={`verdra-lang-container ${className}`}
      ref={dropdownRef}
      style={{ position: "relative", zIndex: 1000 }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="verdra-lang-btn"
        title="Change language / భాష మార్చండి / भाषा बदलें"
        aria-expanded={open}
        style={{
          display: "flex",
          width: "100%",
          minHeight: "38px",
          padding: "6px 9px",
          background: "#f1f6ef",
          border: "1px solid #dce6dc",
          borderRadius: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
          <Globe size={15} color="#2e7d32" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#12372a",
              whiteSpace: "nowrap",
              overflow: "hidden",
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
            right: 0,
            left: "auto",
            width: "max-content",
            minWidth: "195px",
            background: "#ffffff",
            border: "1px solid #dce6dc",
            borderRadius: "14px",
            padding: "6px",
            boxShadow: "0 14px 34px rgba(18, 55, 42, 0.20), 0 4px 12px rgba(18, 55, 42, 0.10)",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            boxSizing: "border-box",
            pointerEvents: "auto",
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
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleSelectLanguage(lang.code);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  handleSelectLanguage(lang.code);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectLanguage(lang.code);
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
                  pointerEvents: "auto",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", pointerEvents: "none" }}>
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
                {isSelected && (
                  <Check
                    size={16}
                    color="#2e7d32"
                    style={{ flexShrink: 0, pointerEvents: "none" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
