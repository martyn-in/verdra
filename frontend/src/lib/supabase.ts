// ============================================
// Verdra — Supabase Client
// ============================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Auth helpers ----
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// ---- Database helpers ----
export async function saveScan(scan: Record<string, unknown>) {
  const { data, error } = await supabase.from("scans").insert(scan).select().single();
  if (error) throw error;
  return data;
}

export async function getScans(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getScan(id: string) {
  const { data, error } = await supabase.from("scans").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function savePredictions(predictions: Record<string, unknown>[]) {
  const { error } = await supabase.from("predictions").insert(predictions);
  if (error) throw error;
}

export async function getFarms(userId: string) {
  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveFarm(farm: Record<string, unknown>) {
  const { data, error } = await supabase.from("farms").insert(farm).select().single();
  if (error) throw error;
  return data;
}

export async function updateFarm(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from("farms").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFarm(id: string) {
  const { error } = await supabase.from("farms").delete().eq("id", id);
  if (error) throw error;
}

export async function getAlerts(userId: string) {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function saveAlert(alert: Record<string, unknown>) {
  const { error } = await supabase.from("alerts").insert(alert);
  if (error) throw error;
}

export async function markAlertRead(id: string) {
  const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from("users_profile").select("*").eq("id", userId).single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function upsertUserProfile(profile: Record<string, unknown>) {
  const { data, error } = await supabase.from("users_profile").upsert(profile).select().single();
  if (error) throw error;
  return data;
}

export async function uploadImage(file: File, path: string) {
  const { data, error } = await supabase.storage.from("scan-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("scan-images").getPublicUrl(data.path);
  return urlData.publicUrl;
}
