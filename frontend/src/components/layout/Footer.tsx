"use client";
import Link from "next/link";
import { Sprout, Mail, Shield, Cpu, CloudRain, Eye, Code } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#DCE8DC] text-[#66736B] transition-colors relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Architecture Specifications Strip */}
        <div className="mb-12 pb-8 border-b border-[#DCE8DC] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
            <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center text-[#2E7D32]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-[#66736B]">Inference Engine</div>
              <div className="text-xs font-bold text-[#12372A]">MobileNetV2 Transfer</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
            <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center text-[#2E7D32]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-[#66736B]">Explainability</div>
              <div className="text-xs font-bold text-[#12372A]">Conv_1 Grad-CAM Map</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
            <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center text-[#2E7D32]">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-[#66736B]">Live Weather</div>
              <div className="text-xs font-bold text-[#12372A]">OpenWeatherMap API</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F8FAF6] border border-[#DCE8DC]">
            <div className="w-8 h-8 rounded-lg bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center text-[#2E7D32]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-[#66736B]">Held-Out Test F1</div>
              <div className="text-xs font-bold text-[#2E7D32] font-mono">99.17% Verified</div>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-[#12372A] flex items-center justify-center text-white shadow-xs">
                <Sprout className="w-4.5 h-4.5 text-[#A7C957]" />
              </div>
              <span className="text-xl font-extrabold text-[#12372A] font-heading">
                Verdra
              </span>
            </Link>
            <p className="text-sm text-[#66736B] leading-relaxed max-w-sm mb-4">
              Intelligent crop disease detection and epidemiological spread prevention for modern growers, agronomists, and farm managers.
            </p>
            <p className="text-xs font-medium text-[#2E7D32] bg-[#EEF6EC] border border-[#DCE8DC] inline-block px-3 py-1 rounded-full">
              Detect Early · Predict Spread · Protect Yield
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-[#12372A] font-heading">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/scan" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Scan a Crop
                </Link>
              </li>
              <li>
                <Link href="/history" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Scan History
                </Link>
              </li>
              <li>
                <Link href="/farm" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Farm Health
                </Link>
              </li>
            </ul>
          </div>

          {/* Intelligence */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-[#12372A] font-heading">
              Intelligence
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/diseases" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Disease Library
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Epidemic Risk
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Verdra Assistant
                </Link>
              </li>
              <li>
                <Link href="/validation" className="text-[#66736B] hover:text-[#12372A] transition-colors">
                  Model Validation
                </Link>
              </li>
            </ul>
          </div>

          {/* Endpoints & Contact */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-[#12372A] font-heading">
              Audited Endpoints
            </h4>
            <div className="space-y-2.5 text-xs">
              <a
                href={
                  process.env.NEXT_PUBLIC_API_URL
                    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}/docs`
                    : "#"
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAF6] border border-[#DCE8DC] text-[#12372A] hover:border-[#2E7D32] transition-colors font-mono"
              >
                <span>/docs (FastAPI Swagger)</span>
              </a>
              <div className="flex items-center gap-2 text-[#66736B] pt-1">
                <Mail className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>support@verdra.ai</span>
              </div>
              <div className="flex items-center gap-2 text-[#66736B]">
                <Code className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>verdra.ai</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 pt-6 border-t border-[#DCE8DC] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#66736B]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2E7D32] shrink-0" />
            <p>
              Auditable Deep Learning Inference & Live Meteorological Telemetry · Zero Mock Predictions.
            </p>
          </div>
          <p className="font-mono text-[11px]">
            © {new Date().getFullYear()} Verdra Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
