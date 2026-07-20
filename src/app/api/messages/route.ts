import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { success: false, message: "taskId zorunludur" },
        { status: 400 }
      );
    }

    const messages = await db.message.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, fullName: true, city: true },
        },
        receiver: {
          select: { id: true, fullName: true, city: true },
        },
      },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { success: false, message: "Mesajlar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, senderId, senderName, content, receiverId, isNegotiation, negotiationPrice, negotiationStatus } = body;

    if (!taskId || !senderId || !content || !receiverId) {
      return NextResponse.json(
        {
          success: false,
          message: "Zorunlu alanlar: taskId, senderId, content, receiverId",
        },
        { status: 400 }
      );
    }

    const message = await db.message.create({
      data: {
        taskId,
        senderId,
        senderName: senderName || "",
        content,
        receiverId,
        isNegotiation: isNegotiation ? Boolean(isNegotiation) : undefined,
        negotiationPrice: negotiationPrice ? Number(negotiationPrice) : undefined,
        negotiationStatus: negotiationStatus || undefined,
      } as any,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { success: false, message: "Mesaj gönderilirken hata oluştu" },
      { status: 500 }
    );
  }
}