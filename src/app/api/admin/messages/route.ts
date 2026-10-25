import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/security";

// İletişim mesajları: yalnızca admin görebilir / yönetebilir
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const messages = await db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const unreadCount = await db.contactMessage.count({ where: { read: false } });
    return NextResponse.json({ success: true, messages, unreadCount });
  } catch (error) {
    console.error("[admin/messages] GET error:", error);
    return NextResponse.json({ success: false, message: "Mesajlar yüklenemedi" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Geçersiz istek" }, { status: 400 });
    }

    if (body.markAllRead === true) {
      await db.contactMessage.updateMany({ data: { read: true } });
      return NextResponse.json({ success: true, message: "Tüm mesajlar okundu olarak işaretlendi" });
    }

    const { id, read } = body as { id?: string; read?: boolean };
    if (!id || typeof read !== "boolean") {
      return NextResponse.json({ success: false, message: "id ve read alanları gerekli" }, { status: 400 });
    }
    await db.contactMessage.update({ where: { id }, data: { read } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/messages] PATCH error:", error);
    return NextResponse.json({ success: false, message: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "id gerekli" }, { status: 400 });
    }
    await db.contactMessage.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ success: true, message: "Mesaj silindi" });
  } catch (error) {
    console.error("[admin/messages] DELETE error:", error);
    return NextResponse.json({ success: false, message: "Silinemedi" }, { status: 500 });
  }
}
