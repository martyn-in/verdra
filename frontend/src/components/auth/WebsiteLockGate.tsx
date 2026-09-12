"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, Unlock, Shield, AlertCircle, Sparkles, CheckCircle2, ArrowRight, Delete } from "lucide-react";

const PASSCODE = "143";
const STORAGE_KEY = "verdra_site_lock_unlocked";

export function lockWebsite() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("verdra_lock_changed"));
  } catch {}
}

export function isWebsiteUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      sessionStorage.getItem(STORAGE_KEY) === "true" ||
      localStorage.getItem(STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export default function WebsiteLockGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", ""]);
  const [error, setError] = useState<string>("");
  const [shaking, setShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const checkState = () => {
      const isOk = isWebsiteUnlocked();
      setUnlocked(isOk);
    };

    checkState();
    window.addEventListener("verdra_lock_changed", checkState);
    return () => window.removeEventListener("verdra_lock_changed", checkState);
  }, []);

  useEffect(() => {
    if (unlocked === false) {
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 150);
    }
  }, [unlocked]);

  const handleDigitChange = (index: number, val: string) => {
    setError("");
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = cleaned;
    setDigits(nextDigits);

    if (cleaned && index < 2) {
      inputsRef.current[index + 1]?.focus();
    }

    const currentCode = nextDigits.join("");
    if (currentCode.length === 3) {
      verifyCode(currentCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      verifyCode(digits.join(""));
    }
  };

  const handleKeypadPress = (num: string) => {
    setError("");
    const emptyIndex = digits.findIndex((d) => d === "");
    if (emptyIndex !== -1) {
      const nextDigits = [...digits];
      nextDigits[emptyIndex] = num;
      setDigits(nextDigits);
      if (emptyIndex < 2) {
        inputsRef.current[emptyIndex + 1]?.focus();
      }
      const currentCode = nextDigits.join("");
      if (currentCode.length === 3) {
        verifyCode(currentCode);
      }
    }
  };

  const handleBackspace = () => {
    setError("");
    for (let i = 2; i >= 0; i--) {
      if (digits[i] !== "") {
        const next = [...digits];
        next[i] = "";
        setDigits(next);
        inputsRef.current[i]?.focus();
        break;
      }
    }
  };

  const handleClear = () => {
    setDigits(["", "", ""]);
    setError("");
    inputsRef.current[0]?.focus();
  };

  const verifyCode = (code: string) => {
    if (code === PASSCODE) {
      setSuccess(true);
      setError("");
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {}
      setTimeout(() => {
        setUnlocked(true);
        setSuccess(false);
      }, 700);
    } else {
      setShaking(true);
      setError("Incorrect code. Enter authorized 3-digit passcode.");
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => {
        setDigits(["", "", ""]);
        inputsRef.current[0]?.focus();
      }, 350);
    }
  };

  // SSR or initial hydration loading state
  if (unlocked === null) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0d261e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#a3cfbb",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48,
            height: 48,
            border: "3px solid rgba(46, 125, 50, 0.3)",
            borderTopColor: "#22c55e",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px"
          }} />
          <p style={{ fontSize: 14, letterSpacing: "0.05em", textTransform: "uppercase" }}>Loading Verdra...</p>
        </div>
      </div>
    );
  }

  // If unlocked, render children
  if (unlocked) {
    return <>{children}</>;
  }

  // Otherwise, render full-screen Lock Gate
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        minHeight: "100vh",
        width: "100vw",
        background: "radial-gradient(ellipse at 50% 20%, #173d30 0%, #0d231b 50%, #081611 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
        color: "#ffffff",
        overflowY: "auto",
      }}
    >
      {/* Background Decorative Foliar Mesh */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage: "radial-gradient(#22c55e 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          background: "rgba(18, 55, 42, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: success ? "1px solid #22c55e" : "1px solid rgba(163, 207, 187, 0.2)",
          borderRadius: 28,
          padding: "36px 28px",
          boxShadow: success
            ? "0 0 60px rgba(34, 197, 94, 0.45), 0 25px 50px -12px rgba(0, 0, 0, 0.6)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(18, 55, 42, 0.5)",
          textAlign: "center",
          transition: "all 0.3s ease",
          transform: shaking ? "translateX(-10px)" : "none",
          animation: shaking ? "shake 0.4s ease-in-out" : "none",
        }}
      >
        {/* Brand Kicker Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 999,
            background: success ? "rgba(34, 197, 94, 0.2)" : "rgba(46, 125, 50, 0.25)",
            border: success ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(74, 222, 128, 0.3)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: success ? "#4ade80" : "#86efac",
            marginBottom: 20,
          }}
        >
          {success ? <CheckCircle2 size={14} /> : <Shield size={14} />}
          <span>{success ? "Access Granted" : "Verdra Protected"}</span>
        </div>

        {/* Lock / Unlock Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: success
              ? "linear-gradient(135deg, #16a34a, #22c55e)"
              : "linear-gradient(135deg, #1b4332, #2d6a4f)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: success
              ? "0 0 30px rgba(34, 197, 94, 0.6)"
              : "0 10px 25px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: success ? "scale(1.1) rotate(5deg)" : "scale(1)",
          }}
        >
          {success ? (
            <Unlock size={36} color="#ffffff" strokeWidth={2.4} />
          ) : (
            <Lock size={34} color="#a3cfbb" strokeWidth={2.2} />
          )}
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 8,
            color: "#ffffff",
          }}
        >
          {success ? "Welcome to Verdra" : "Website Protected"}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: 26,
            lineHeight: 1.5,
          }}
        >
          {success
            ? "Passcode verified. Unlocking dashboard & neural pipeline..."
            : "Please enter the 3-digit security code to access Verdra AI."}
        </p>

        {/* 3-Digit PIN Input Display */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {[0, 1, 2].map((idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputsRef.current[idx] = el;
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digits[idx]}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              style={{
                width: 68,
                height: 76,
                borderRadius: 18,
                background: digits[idx]
                  ? "rgba(34, 197, 94, 0.18)"
                  : "rgba(255, 255, 255, 0.06)",
                border: digits[idx]
                  ? "2px solid #22c55e"
                  : "2px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: 32,
                fontWeight: 900,
                textAlign: "center",
                outline: "none",
                boxShadow: digits[idx]
                  ? "0 0 20px rgba(34, 197, 94, 0.3)"
                  : "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#f87171",
              fontSize: 13,
              fontWeight: 600,
              background: "rgba(239, 68, 68, 0.15)",
              padding: "6px 14px",
              borderRadius: 10,
              marginBottom: 16,
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* On-screen Numeric Keypad for Mobile and Touch Devices */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            maxWidth: 300,
            margin: "0 auto 18px",
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeypadPress(n)}
              style={{
                height: 52,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(34, 197, 94, 0.25)";
                e.currentTarget.style.borderColor = "#22c55e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            style={{
              height: 52,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeypadPress("0")}
            style={{
              height: 52,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 700,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(34, 197, 94, 0.25)";
              e.currentTarget.style.borderColor = "#22c55e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            style={{
              height: 52,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Delete size={18} />
          </button>
        </div>

        {/* Enter Code Button */}
        <button
          type="button"
          onClick={() => verifyCode(digits.join(""))}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 10px 20px rgba(22, 163, 74, 0.35)",
            letterSpacing: "0.02em",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 14px 25px rgba(22, 163, 74, 0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(22, 163, 74, 0.35)";
          }}
        >
          <span>Unlock Verdra</span>
          <ArrowRight size={17} />
        </button>

        <div style={{ marginTop: 22, fontSize: 12, color: "rgba(255, 255, 255, 0.45)" }}>
          Agricultural Intelligence Decision Support Platform
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
