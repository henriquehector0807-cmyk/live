import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface VideoUploadResult {
  url: string;
  videoId: string;
}

export interface VideoStorageProvider {
  uploadVideo(file: Express.Multer.File): Promise<VideoUploadResult>;
  getPlaybackUrl(videoId: string): Promise<string>;
  deleteVideo(videoId: string): Promise<void>;
}

export class SupabaseVideoStorageService implements VideoStorageProvider {
  private supabase: SupabaseClient;
  private bucketName = "videos";

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadVideo(file: Express.Multer.File): Promise<VideoUploadResult> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const fileBuffer = fs.readFileSync(file.path);

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Remove temporary local file after successful upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const { data: publicData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileName);

    return {
      url: publicData.publicUrl,
      videoId: fileName
    };
  }

  async getPlaybackUrl(videoId: string): Promise<string> {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(videoId);
    return data.publicUrl;
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.supabase.storage.from(this.bucketName).remove([videoId]);
  }
}

export class LocalVideoStorageService implements VideoStorageProvider {

  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async uploadVideo(file: Express.Multer.File): Promise<VideoUploadResult> {
    // Note: Since multer already saves the file, we just return the URL.
    // In a real external provider (e.g., Cloudflare), we would upload the buffer here.
    return {
      // Relative URLs work in localhost, Vercel previews, and production domains.
      url: `/uploads/${encodeURIComponent(file.filename)}`,
      videoId: file.filename,
    };
  }

  async getPlaybackUrl(videoId: string): Promise<string> {
    return `${this.baseUrl}/uploads/${videoId}`;
  }

  async deleteVideo(videoId: string): Promise<void> {
    const filepath = path.join(process.cwd(), 'uploads', videoId);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
}

// Prepare Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const videoUploadMiddleware = multer({ storage });

export const imageUploadMiddleware = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg|avif|ico|bmp)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de imagem são permitidos (JPG, PNG, WebP, GIF, SVG, etc)."));
    }
  },
});
