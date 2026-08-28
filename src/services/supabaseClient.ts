import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const isValidUrl = supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://");
  if (!isValidUrl) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}

export interface SupabaseStatusResult {
  configured: boolean;
  connected: boolean;
  url?: string;
  storageBuckets?: string[];
  message: string;
  error?: string;
}

export async function checkSupabaseConnection(): Promise<SupabaseStatusResult> {
  const client = getSupabaseClient();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();

  if (!client || !supabaseUrl) {
    return {
      configured: false,
      connected: false,
      message: "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env",
    };
  }

  try {
    // Check storage bucket access
    const { data: buckets, error: storageError } = await client.storage.listBuckets();
    
    if (storageError) {
      return {
        configured: true,
        connected: false,
        url: supabaseUrl,
        message: "Falha ao conectar com o Supabase Storage",
        error: storageError.message,
      };
    }

    const bucketNames = (buckets || []).map((b) => b.name);

    return {
      configured: true,
      connected: true,
      url: supabaseUrl,
      storageBuckets: bucketNames,
      message: "Conexão com o Supabase estabelecida com sucesso!",
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      url: supabaseUrl,
      message: "Erro ao testar conexão com o Supabase",
      error: err?.message || String(err),
    };
  }
}

export async function uploadImageToSupabase(file: Express.Multer.File, bucketName: string = "images"): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      await client.storage.createBucket(bucketName, { public: true });
    }

    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const fileBuffer = fs.readFileSync(file.path);

    const { error: uploadError } = await client.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase image upload error:", uploadError);
      return null;
    }

    const { data } = client.storage.from(bucketName).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (e) {
    console.warn("Supabase image upload failed:", e);
    return null;
  }
}

