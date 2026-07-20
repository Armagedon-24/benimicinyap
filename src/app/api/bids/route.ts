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

    const bids = await db.bid.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      include: {
        tasker: {
          select: { id: true, fullName: true, city: true, rating: true },
        },
      },
    });

    return NextResponse.json({ success: true, bids });
  } catch (error) {
    console.error("Bids GET error:", error);
    return NextResponse.json(
      { success: false, message: "Teklifler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, taskerId, taskerName, taskerRating, amount, proposalText } =
      body;

    if (!taskId || !taskerId || !amount) {
      return NextResponse.json(
        {
          success: false,
          message: "Zorunlu alanlar: taskId, taskerId, amount",
        },
        { status: 400 }
      );
    }

    // Check if tasker already bid on this task
    const existingBid = await db.bid.findFirst({
      where: { taskId, taskerId },
    });

    if (existingBid) {
      return NextResponse.json(
        { success: false, message: "Bu göreve zaten teklif verdiniz" },
        { status: 400 }
      );
    }

    const bid = await db.bid.create({
      data: {
        taskId,
        taskerId,
        taskerName: taskerName || "",
        taskerRating: taskerRating || 5.0,
        amount,
        proposalText: proposalText || "",
      },
    });

    // Create notification for task requester
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (task && task.requesterId) {
      await db.notification.create({
        data: {
          userId: task.requesterId,
          title: "Yeni Görev Başvurusu / Teklifi",
          message: `"${task.title}" göreviniz için ${taskerName || "Bir görevli"} tarafından ${amount.toLocaleString("tr-TR")} ₺ tutarında yeni teklif/başvuru yapıldı.`,
          type: "info",
          read: false,
        },
      });
    }

    return NextResponse.json({ success: true, bid });
  } catch (error) {
    console.error("Bids POST error:", error);
    return NextResponse.json(
      { success: false, message: "Teklif oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}