
import { createClient } from './supabase';

/**
 * Server-side Supabase Storage helpers
 * Handles file uploads, downloads, and management through Supabase Storage
 */

// Upload a file to Supabase Storage
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; cacheControl?: string }
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      cacheControl: options?.cacheControl || '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }

  return data;
}

// Get public URL for a file
export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const supabase = await createClient();
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

// Delete a file from storage
export async function deleteFile(bucket: string, path: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Error deleting file:', error);
    throw error;
  }

  return data;
}

// List files in a bucket
export async function listFiles(bucket: string, folder: string = '') {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder);

  if (error) {
    console.error('Error listing files:', error);
    throw error;
  }

  return data;
}

// Download a file
export async function downloadFile(bucket: string, path: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    console.error('Error downloading file:', error);
    throw error;
  }

  return data;
}
