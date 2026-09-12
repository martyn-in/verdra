"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import enLocale from "@/locales/en.json";
import teLocale from "@/locales/te.json";
import hiLocale from "@/locales/hi.json";

import enDisease from "@/locales/disease_knowledge_en.json";
import teDisease from "@/locales/disease_knowledge_te.json";
import hiDisease from "@/locales/disease_knowledge_hi.json";

export type Language = "en" | "te" | "hi";

interface DiseaseKnowledgeItem {
  canonical_name: string;
  pathogen: string;
  local_summary: string;
  immediate_actions: string[];
  preventive_actions: string[];
  monitoring_advice: string[];
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
  getDiseaseKnowledge: (diseaseName: string) => DiseaseKnowledgeItem | null;
}

const UI_LOCALES: Record<Language, any> = {
  en: enLocale,
  te: teLocale,
  hi: hiLocale,
};

const DISEASE_LOCALES: Record<Language, Record<string, DiseaseKnowledgeItem>> = {
  en: enDisease as any,
  te: teDisease as any,
  hi: hiDisease as any,
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (path, fallback) => fallback || path,
  getDiseaseKnowledge: () => null,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("verdra_preferred_lang") as Language;
      if (saved && (saved === "en" || saved === "te" || saved === "hi")) {
        setLangState(saved);
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    try {
      localStorage.setItem("verdra_preferred_lang", lang);
    } catch {}
  };

  const t = (path: string, fallback?: string): string => {
    const parts = path.split(".");
    
    // 1. Try selected language
    let current = UI_LOCALES[language];
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === "string") return current;

    // 2. Fallback to English
    let enCurrent = UI_LOCALES.en;
    for (const part of parts) {
      if (enCurrent && typeof enCurrent === "object" && part in enCurrent) {
        enCurrent = enCurrent[part];
      } else {
        enCurrent = undefined;
        break;
      }
    }
    if (typeof enCurrent === "string") return enCurrent;

    return fallback || path;
  };

  const getDiseaseKnowledge = (diseaseName: string): DiseaseKnowledgeItem | null => {
    if (!diseaseName) return null;

    // Canonical key lookup matching
    const currentDict = DISEASE_LOCALES[language] || DISEASE_LOCALES.en;
    const enDict = DISEASE_LOCALES.en;

    // Direct match
    if (currentDict[diseaseName]) return currentDict[diseaseName];

    // Normalized match (e.g. "Tomato Early Blight" vs "Tomato_Early_Blight")
    const clean = diseaseName.replace(/_/g, " ").trim().toLowerCase();
    for (const [k, v] of Object.entries(currentDict)) {
      if (k.toLowerCase() === clean || clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean)) {
        return v;
      }
    }

    // English Fallback
    for (const [k, v] of Object.entries(enDict)) {
      if (k.toLowerCase() === clean || clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean)) {
        return v;
      }
    }

    return null;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getDiseaseKnowledge }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
