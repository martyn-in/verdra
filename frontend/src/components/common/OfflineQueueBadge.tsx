"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import {
  getPendingQueueItems,
  syncOfflineQueue,
  OfflineQueueItem,
} from "@/lib/offlineQueue";

export default function OfflineQueueBadge({
  onSyncCompleted,
}: {
  onSyncCompleted?: (item: OfflineQueueItem, result: any) => void;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkQueue = async () => {
    try {
      const items = await getPendingQueueItems();
      setPendingCount(items.length);
    } catch {
      // IndexedDB may be inaccessible
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    checkQueue();

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await syncOfflineQueue((item, res) => {
          if (onSyncCompleted) onSyncCompleted(item, res);
        });
      } finally {
        setIsSyncing(false);
        checkQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(checkQueue, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [onSyncCompleted]);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue((item, res) => {
        if (onSyncCompleted) onSyncCompleted(item, res);
      });
    } finally {
      setIsSyncing(false);
      checkQueue();
    }
  };

  if (isOnline && pendingCount === 0) {
    return null; // Keep clean when online with empty queue
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono backdrop-blur-md transition-all border shadow-lg bg-[#0d1612]/90 border-white/10">
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-amber-300 font-medium">Offline</span>
          {pendingCount > 0 && (
            <span className="text-[11px] text-[#8EA396]">
              • {pendingCount} queued
            </span>
          )}
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 text-[#52B788] shrink-0" />
          <span className="text-emerald-300 font-medium">Online</span>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-[11px] text-[#52B788] hover:underline"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : `Sync ${pendingCount} queued`}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
