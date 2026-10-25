import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { requireUser, securityEvent } from "@/lib/security";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, { ext: string; label: string }> = {
  "image/jpeg": { ext: "jpg", label: "JPEG" },
  "image/png": { ext: "png", label: "PNG" },
  "image/webp": { ext: "webp", label: "WebP" },
};

/**
 * Magic-byte sniffing — the declared Content-Type can be spoofed, so we verify
 * the real signature of the uploaded bytes. This also keeps the AI proof scan
 * meaningful: only genuine image files enter the evidence pipeline.
 */
function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length < 12) return null;
  const b = buffer;

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, message: "Geçersiz form verisi (multipart/form-data bekleniyor)" },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "Dosya bulunamadı. Lütfen bir kanıt fotoğrafı seçin." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, message: "Boş dosya yüklenemez" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). En fazla 10 MB yüklenebilir.` },
        { status: 413 }
      );
    }

    const declaredType = file.type || "";
    if (declaredType && !ALLOWED_TYPES[declaredType]) {
      return NextResponse.json(
        { success: false, message: "Desteklenmeyen dosya türü. Yalnızca JPEG, PNG veya WebP yükleyebilirsiniz." },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);
    if (!detected) {
      securityEvent(
        "proof_upload_rejected",
        `declared=${declaredType || "none"} size=${file.size}`,
        auth.user!.id
      ).catch(() => {});
      return NextResponse.json(
        { success: false, message: "Dosya gerçek bir fotoğraf değil (imza doğrulaması başarısız). JPEG, PNG veya WebP gerekli." },
        { status: 415 }
      );
    }

    // Vercel serverless: yalnızca /tmp yazılabilir → dosyalar /tmp'ye yazılır,
    // /api/files/proofs/[file] rotası üzerinden servis edilir.
    // Lokal geliştirme: public/uploads/proofs (statik servis) aynen korunur.
    const isServerless = process.env.VERCEL === "1" || process.env.DB_FORCE_TMP === "1";
    const dir = isServerless
      ? "/tmp/uploads/proofs"
      : path.join(process.cwd(), "public", "uploads", "proofs");
    await mkdir(dir, { recursive: true });

    const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const fileName = `${unique}.${detected.ext}`;
    const filePath = path.join(dir, fileName);
    await writeFile(filePath, buffer);

    const url = isServerless
      ? `/api/files/proofs/${fileName}`
      : `/uploads/proofs/${fileName}`;

    return NextResponse.json({
      success: true,
      url,
      size: file.size,
      type: detected.mime,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Proof upload error:", error);
    return NextResponse.json(
      { success: false, message: "Dosya yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
