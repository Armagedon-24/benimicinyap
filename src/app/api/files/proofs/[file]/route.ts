import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Kanıt fotoğrafı sunum rotası (Vercel serverless uyumlu).
 *
 * - Vercel'de yüklenen dosyalar /tmp/uploads/proofs altında tutulur (read-only FS
 *   nedeniyle public/ yazılamaz). Bu rota onları /api/files/proofs/<dosya> olarak servis eder.
 * - Lokal geliştirmede public/uploads/proofs altındaki dosyalar da aynı rota ile erişilebilir
 *   (geriye dönük uyumluluk — eski kanıt URL'leri bozulmaz).
 */

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function candidateDirs(): string[] {
  return [
    "/tmp/uploads/proofs", // Vercel serverless yazılabilir alan
    path.join(process.cwd(), "public", "uploads", "proofs"), // lokal statik alan
  ];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await params;

    // Path traversal koruması: yalnızca güvenli dosya adları kabul edilir
    if (!file || !/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..")) {
      return NextResponse.json({ success: false, message: "Geçersiz dosya adı" }, { status: 400 });
    }

    const ext = path.extname(file).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      return NextResponse.json(
        { success: false, message: "Desteklenmeyen dosya türü" },
        { status: 415 }
      );
    }

    for (const dir of candidateDirs()) {
      try {
        const buffer = await readFile(path.join(dir, file));
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(buffer.length),
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
          console.error(`Proof file read error at ${dir}:`, err);
        }
        // ENOENT → sonraki adayı dene
      }
    }

    return NextResponse.json(
      { success: false, message: "Dosya bulunamadı" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Proof file serve error:", error);
    return NextResponse.json(
      { success: false, message: "Dosya servis hatası" },
      { status: 500 }
    );
  }
}
