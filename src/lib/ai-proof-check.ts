import exifr from "exifr";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export type AiVerdict = "human" | "ai_suspected" | "unclear";

export interface AiCheckResult {
  verdict: AiVerdict;
  score: number; // 0-100: human-made confidence
  reason: string;
  signals: string[];
}

const AI_SIGNATURES = [
  "dall-e", "dalle", "dall_e", "openai", "midjourney", "stable diffusion",
  "stablediffusion", "stable-diffusion", "automatic1111", "comfyui",
  "c2pa", "jumbf", "trainedalgorithmicmedia",
  "adobe firefly", "sora", "ideogram", "leonardo.ai", "runwayml",
];

const STOCK_URL_PATTERNS = [
  "unsplash.com", "images.unsplash.com", "pexels.com", "images.pexels.com",
  "pixabay.com", "cdn.pixabay.com", "freepik", "placehold.co",
  "placekitten.com", "picsum.photos", "via.placeholder.com",
];

function bufferIncludes(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let fetchUrl = url;
    if (url.startsWith("/")) {
      const base = process.env.APP_BASE_URL || "http://localhost:3000";
      fetchUrl = `${base}${url}`;
    }
    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType: res.headers.get("content-type") || "image/jpeg" };
  } catch {
    return null;
  }
}

function scanAiSignatures(buffer: Buffer, contentType: string): string[] {
  const found: string[] = [];
  try {
    // Scan the whole file (incl. XMP/C2PA chunks) as latin1 for known generator signatures
    const raw = buffer.toString("latin1");
    const lower = raw.toLowerCase();
    for (const sig of AI_SIGNATURES) {
      if (bufferIncludes(lower, sig)) found.push(`Görsel meta verisinde "${sig}" imzası bulundu`);
    }
  } catch {
    // ignore scan errors
  }
  if (contentType.includes("svg")) {
    found.push("Kanıt fotoğrafı SVG formatında (gerçek kamera çıktısı değil)");
  }
  return found;
}

async function analyzeExif(buffer: Buffer): Promise<{ signals: string[]; hasCamera: boolean; hasGps: boolean }> {
  const signals: string[] = [];
  let hasCamera = false;
  let hasGps = false;
  try {
    const exif = (await exifr.parse(buffer, { gps: false, tiff: true, exif: true, ifd0: true })) as Record<string, unknown> | undefined;
    if (exif) {
      const make = exif.Make as string | undefined;
      const model = exif.Model as string | undefined;
      const lens = (exif.LensModel || exif.LensMake) as string | undefined;
      const software = exif.Software as string | undefined;
      const dateTaken = exif.DateTimeOriginal || exif.CreateDate;
      const swLower = (software || "").toLowerCase();

      if (make || model) {
        hasCamera = true;
        signals.push(`Kamera bilgisi mevcut: ${[make, model].filter(Boolean).join(" ")}${lens ? ` (lens: ${lens})` : ""}`);
      }
      if (dateTaken) {
        signals.push(`Çekim tarihi meta verisi: ${new Date(dateTaken).toISOString().slice(0, 16).replace("T", " ")}`);
      }
      if (swLower) {
        const aiSw = AI_SIGNATURES.find((s) => swLower.includes(s));
        if (aiSw) {
          signals.push(`Görüntü işleme yazılımı AI üreticisi: ${software}`);
        }
      }
      if (!make && !model && !dateTaken) {
        signals.push("EXIF kamera meta verisi tamamen silinmiş (telefon dışı kaynak / düzenleme / üretim şüphesi)");
      }
    } else {
      signals.push("Görselde EXIF meta verisi hiç yok (gerçek telefon fotoğraflarında bulunur)");
    }

    const gps = (await exifr.gps(buffer).catch(() => null)) as { latitude?: number; longitude?: number } | null;
    if (gps && typeof gps.latitude === "number") {
      hasGps = true;
      signals.push(`Görselde GPS koordinatı gömülü: ${gps.latitude.toFixed(4)}, ${gps.longitude?.toFixed(4)}`);
    }
  } catch {
    signals.push("EXIF okuması yapılamadı (bozuk veya minimal meta veri)");
  }
  return { signals, hasCamera, hasGps };
}

function heuristicScore(opts: {
  aiSigFound: boolean;
  hasCamera: boolean;
  hasGps: boolean;
  stockUrl: boolean;
  textAiLikely: boolean;
}): number {
  let score = 50;
  if (opts.aiSigFound) score -= 45;
  if (opts.hasCamera) score += 25;
  if (opts.hasGps) score += 10;
  if (opts.stockUrl) score -= 20;
  if (opts.textAiLikely) score -= 15;
  return Math.max(2, Math.min(98, score));
}

function buildLlmPrompt(taskTitle: string, taskDesc: string, proofText: string, signals: string[]): Array<{ role: "assistant" | "user"; content: string }> {
  return [
    {
      role: "assistant",
      content: `Sen bir güvenlik görev akışı denetçisisin. Bir saha görevi teslimat kanıtının yapay zeka ile üretilip üretilmediğini değerlendiriyorsun.
Kanıt iki kısımdan oluşur: görevlinin yazdığı teslim notu ve fotoğrafın teknik meta veri incelemesinden çıkan sinyaller.
Görev bağlamına göre şu kurallara göre karar ver:
1) Teslim notu robotik, genel geçer, görev detayına hiç inmeden klişe cümlelerle yazılmışsa veya görev açıklamasıyla çelişiyorsa AI üretimi metin şüphesi artar.
2) Görsel sinyallerinde yapay zeka üretici imzası varsa veya kamera/EXIF verisi yoksa AI üretim şüphesi artar; gerçek kamera + GPS verisi varsa insan yapımı olasılığı artar.
SADECE aşağıdaki formatta geçerli JSON döndür, başka hiçbir metin yazma:
{"humanScore": <0-100 insan yapımı olasılığı sayısı>, "reason": "<en fazla 2 cümle Türkçe gerekçe>"}`,
    },
    {
      role: "user",
      content: `GÖREV BAŞLIĞI: ${taskTitle}
GÖREV AÇIKLAMASI: ${taskDesc}

TESLİM NOTU (görevli tarafından yazıldı):
"""
${proofText || "(boş bırakılmış)"}
"""

GÖRSEL META VERİ İNCELEME SİNYALLERİ:
${signals.length ? signals.map((s, i) => `${i + 1}. ${s}`).join("\n") : "(görsel yok, sadece metin analizi yap)"}

Bu kanıtı değerlendir ve JSON döndür.`,
    },
  ];
}

function parseLlmJson(text: string): { humanScore: number; reason: string } | null {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof parsed.humanScore !== "number" || typeof parsed.reason !== "string") return null;
    return {
      humanScore: Math.max(0, Math.min(100, parsed.humanScore)),
      reason: parsed.reason.slice(0, 400),
    };
  } catch {
    return null;
  }
}

export async function runAiProofCheck(taskId: string): Promise<AiCheckResult | null> {
  const task = (await db.task.findUnique({ where: { id: taskId } })) as any;
  if (!task) return null;

  const signals: string[] = [];
  let aiSigFound = false;
  let hasCamera = false;
  let hasGps = false;
  let stockUrl = false;

  const photoUrl: string = task.evidencePhoto || "";
  if (photoUrl) {
    const lowerUrl = photoUrl.toLowerCase();
    stockUrl = STOCK_URL_PATTERNS.some((p) => lowerUrl.includes(p));
    if (stockUrl) signals.push("Fotoğraf URL'i bilinen bir stok fotoğraf servisinden geliyor (sahada çekilmiş olma olasılığı düşük)");

    const img = await downloadImage(photoUrl);
    if (img) {
      const sigs = scanAiSignatures(img.buffer, img.contentType);
      if (sigs.length) {
        aiSigFound = true;
        signals.push(...sigs);
      }
      const exifRes = await analyzeExif(img.buffer);
      hasCamera = exifRes.hasCamera;
      hasGps = exifRes.hasGps;
      signals.push(...exifRes.signals);
      signals.push(`Görsel boyutu ${Math.round(img.buffer.length / 1024)} KB, format ${img.contentType}`);
    } else {
      signals.push("Kanıt fotoğrafı indirilemedi (bağlantı bozuk veya erişilemez) — doğrulama güveni düşürüldü");
    }
  } else {
    signals.push("Kanıt fotoğrafı yüklenmemiş");
  }

  const proofText: string = task.evidenceDescription || "";

  // Ask LLM for the final judgement on text + combined signals
  let humanScore: number | null = null;
  let reason = "";
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: buildLlmPrompt(task.title, task.description || "", proofText, signals),
      thinking: { type: "disabled" },
    });
    const parsed = parseLlmJson(completion.choices[0]?.message?.content || "");
    if (parsed) {
      humanScore = parsed.humanScore;
      reason = parsed.reason;
    }
  } catch {
    // fall through to heuristic
  }

  const textAiLikely = humanScore !== null ? humanScore < 40 : false;
  const fallbackScore = heuristicScore({ aiSigFound, hasCamera, hasGps, stockUrl, textAiLikely });
  const finalScore = humanScore !== null ? Math.round(humanScore * 0.6 + fallbackScore * 0.4) : fallbackScore;

  if (!reason) {
    if (aiSigFound) reason = "Görsel meta verisinde yapay zeka üretici imzası tespit edildi.";
    else if (hasCamera) reason = "Gerçek kamera EXIF verisi bulundu, kanıt insan tarafından çekilmiş görünüyor.";
    else if (stockUrl) reason = "Fotoğraf stok bir kaynaktan geliyor ve kamera verisi yok, kanıt değeri düşük.";
    else reason = "Yeterli doğrulayıcı meta veri bulunamadı, manuel inceleme önerilir.";
  }

  let verdict: AiVerdict;
  if (finalScore >= 65) verdict = "human";
  else if (finalScore < 35) verdict = "ai_suspected";
  else verdict = "unclear";

  const result: AiCheckResult = { verdict, score: finalScore, reason, signals };

  await db.task.update({
    where: { id: taskId },
    data: {
      aiCheckVerdict: verdict,
      aiCheckScore: finalScore,
      aiCheckReason: reason,
      aiCheckSignals: JSON.stringify(signals),
      aiCheckedAt: new Date().toISOString(),
    },
  });

  return result;
}
