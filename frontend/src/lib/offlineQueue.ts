/**
 * Verdra — Real Offline Scan Queue using native IndexedDB
 * Stores image blobs + metadata locally when offline.
 * Automatically synchronizes with /api/predict upon 'online' event.
 */

const DB_NAME = "verdra_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "scan_queue";

export interface OfflineQueueItem {
  local_queue_id: string;
  image_blob: Blob;
  filename: string;
  crop: string;
  farm_id?: string;
  field_id?: string;
  plant_id?: string;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  created_at: string;
  status: "queued" | "uploading" | "completed" | "failed";
  error_message?: string;
  result?: any;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "local_queue_id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineScan(
  file: File | Blob,
  metadata: {
    crop?: string;
    farm_id?: string;
    field_id?: string;
    plant_id?: string;
    latitude?: number;
    longitude?: number;
    location_accuracy?: number;
    filename?: string;
  }
): Promise<OfflineQueueItem> {
  const db = await openDatabase();
  const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const item: OfflineQueueItem = {
    local_queue_id: queueId,
    image_blob: file,
    filename: metadata.filename || (file instanceof File ? file.name : `scan_${Date.now()}.jpg`),
    crop: metadata.crop || "auto",
    farm_id: metadata.farm_id,
    field_id: metadata.field_id,
    plant_id: metadata.plant_id,
    latitude: metadata.latitude,
    longitude: metadata.longitude,
    location_accuracy: metadata.location_accuracy,
    created_at: new Date().toISOString(),
    status: "queued",
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingQueueItems(): Promise<OfflineQueueItem[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const items: OfflineQueueItem[] = req.result || [];
      resolve(items.filter((i) => i.status === "queued" || i.status === "failed"));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllQueueItems(): Promise<OfflineQueueItem[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function updateQueueItemStatus(
  queueId: string,
  status: "queued" | "uploading" | "completed" | "failed",
  result?: any,
  errorMessage?: string
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(queueId);

    getReq.onsuccess = () => {
      const item = getReq.result as OfflineQueueItem;
      if (!item) {
        resolve();
        return;
      }
      item.status = status;
      if (result) item.result = result;
      if (errorMessage) item.error_message = errorMessage;
      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeQueueItem(queueId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(queueId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Trigger batch synchronization of all queued scans against the real /api/predict endpoint.
 */
export async function syncOfflineQueue(
  onItemSynced?: (item: OfflineQueueItem, result: any) => void
): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingQueueItems();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    await updateQueueItemStatus(item.local_queue_id, "uploading");

    try {
      const file = new File([item.image_blob], item.filename, {
        type: item.image_blob.type || "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", file);
      if (item.crop) formData.append("crop", item.crop);
      if (item.farm_id) formData.append("farm_id", item.farm_id);
      if (item.field_id) formData.append("field_id", item.field_id);
      if (item.plant_id) formData.append("plant_id", item.plant_id);
      if (item.latitude) formData.append("latitude", item.latitude.toString());
      if (item.longitude) formData.append("longitude", item.longitude.toString());
      if (item.location_accuracy) formData.append("location_accuracy", item.location_accuracy.toString());

      const res = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const result = await res.json();
      await updateQueueItemStatus(item.local_queue_id, "completed", result);
      synced++;

      if (onItemSynced) {
        onItemSynced(item, result);
      }
    } catch (err: any) {
      console.warn(`Sync failed for queue item ${item.local_queue_id}:`, err);
      await updateQueueItemStatus(item.local_queue_id, "failed", undefined, err.message);
      failed++;
    }
  }

  return { synced, failed };
}
