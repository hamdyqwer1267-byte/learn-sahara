import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "course-media";
export const STORAGE_PREFIX = "storage:";

export function isStorageRef(value: string) {
  return value.trim().startsWith(STORAGE_PREFIX);
}

export function storagePath(value: string) {
  return value.trim().slice(STORAGE_PREFIX.length);
}

/** Uploads a file to the private course-media bucket and returns a "storage:<path>" reference. */
export async function uploadCourseMedia(file: File, folder: "videos" | "pdfs") {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return `${STORAGE_PREFIX}${path}`;
}

/** Resolves a stored value (plain URL or storage ref) to a playable/downloadable URL. */
export async function resolveMediaUrl(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (!isStorageRef(raw)) return raw;
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath(raw), 60 * 60 * 4);
  if (error) return "";
  return data?.signedUrl ?? "";
}
