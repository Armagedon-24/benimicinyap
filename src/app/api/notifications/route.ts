import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId zorunludur" },
        { status: 400 }
      );
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { success: false, message: "Bildirimler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "Zorunlu alanlar: userId, title, message",
        },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || "info",
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { success: false, message: "Bildirim oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "notificationId zorunludur" },
        { status: 400 }
      );
    }

    const notification = await db.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Bildirim güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId zorunludur" },
        { status: 400 }
      );
    }

    await db.notification.deleteMany({ where: { userId } });

    return NextResponse.json({
      success: true,
      message: "Tüm bildirimler başarıyla silindi",
    });
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Bildirimler silinirken hata oluştu" },
      { status: 500 }
    );
  }
}