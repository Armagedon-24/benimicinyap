import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowRateLimit, securityEvent } from "@/lib/security";

// Genel iletişim mesajı: giriş gerektirmez, admin paneline düşer
export async function POST(request: NextRequest) {
  try {
    if (!allowRateLimit(request, "contact", 5, 60_000)) {
      return NextResponse.json(
        { success: false, message: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Geçersiz istek" }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ success: false, message: "Ad soyad 2-60 karakter olmalıdır." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
      return NextResponse.json({ success: false, message: "Geçerli bir e-posta adresi girin." }, { status: 400 });
    }
    if (subject.length > 120) {
      return NextResponse.json({ success: false, message: "Konu en fazla 120 karakter olabilir." }, { status: 400 });
    }
    if (message.length < 5 || message.length > 1000) {
      return NextResponse.json({ success: false, message: "Mesaj 5-1000 karakter arasında olmalıdır." }, { status: 400 });
    }

    const saved = await db.contactMessage.create({
      data: { name, email, subject, message },
    });

    await securityEvent("contact_message", `${name} <${email}> konu: ${subject || "-"}`);

    return NextResponse.json({
      success: true,
      message: "Mesajınız alındı! Ekibimiz en kısa sürede size dönüş yapacak.",
      id: saved.id,
    });
  } catch (error) {
    console.error("[contact] POST error:", error);
    return NextResponse.json(
      { success: false, message: "Mesaj gönderilemedi. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
