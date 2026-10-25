import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SESSION_COOKIE = "bimy_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_PREFIX = "scrypt$";
const attempts = new Map<string, { count: number; resetAt: number }>();

function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    // Vercel/demo uyumluluk: AUTH_SECRET ayarlanmadıysa sabit yedek anahtar kullan.
    // Güvenli üretim için Vercel'de AUTH_SECRET env değişkeni tanımlanmalıdır.
    console.warn("[security] AUTH_SECRET tanimli degil — yedek oturum anahtari kullaniliyor. Uretimde AUTH_SECRET ayarlayin.");
    return "benimicinyap-fallback-session-secret-change-me";
  }
  return "development-only-session-secret";
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function sessionValue(userId: string, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  return `${encode(payload)}.${sign(payload)}`;
}

function readSession(request: NextRequest): { userId: string } | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [encodedPayload, signature] = raw.split(".");
  if (!encodedPayload || !signature) return null;
  const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [userId, expiresAt] = payload.split(".");
  if (!userId || !expiresAt || Number(expiresAt) <= Date.now()) return null;
  return { userId };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_PREFIX}${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith(PASSWORD_PREFIX)) {
    const actual = Buffer.from(password);
    const expected = Buffer.from(stored);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function isPasswordHash(stored: string): boolean {
  return stored.startsWith(PASSWORD_PREFIX);
}

export async function currentUser(request: NextRequest) {
  const session = readSession(request);
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

export async function requireUser(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return { response: NextResponse.json({ success: false, message: "Oturum gerekli" }, { status: 401 }), user: null };
  return { response: null, user };
}

export async function requireAdmin(request: NextRequest) {
  const result = await requireUser(request);
  if (result.response) return result;
  if (result.user?.role !== "admin") {
    return { response: NextResponse.json({ success: false, message: "Yönetici yetkisi gerekli" }, { status: 403 }), user: null };
  }
  return result;
}

export function setSession(response: NextResponse, userId: string): NextResponse {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  response.cookies.set(SESSION_COOKIE, sessionValue(userId, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}

export function allowRateLimit(request: NextRequest, bucket: string, limit = 20, windowMs = 60_000): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${bucket}:${forwarded || "local"}`;
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export async function securityEvent(event: string, detail: string, userId?: string): Promise<void> {
  try {
    await db.systemLog.create({ data: { level: "security", message: `${event}: ${detail}${userId ? ` [user:${userId}]` : ""}` } });
  } catch {
    console.error("Security event could not be persisted", { event, detail, userId });
  }
}