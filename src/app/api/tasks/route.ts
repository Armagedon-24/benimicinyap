import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "";
    const category = searchParams.get("category") || "";
    const query = searchParams.get("query") || "";

    const where: Record<string, unknown> = {};

    if (city) {
      where.city = city;
    }

    if (category) {
      where.category = category;
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { district: { contains: query } },
      ];
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            city: true,
            rating: true,
            tcVerified: true,
            completedTasksCount: true,
            totalReviews: true,
            walletBalance: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json(
      { success: false, message: "Görevler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      city,
      district,
      category,
      fee,
      dueDate,
      latitude,
      longitude,
      requesterId,
    } = body;

    const numFee = Number(fee);
    if (!title || !description || !city || !category || isNaN(numFee) || numFee <= 0 || !requesterId) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz veya eksik alanlar. Görev ücreti 0'dan büyük bir sayı olmalıdır.",
        },
        { status: 400 }
      );
    }

    // Check user has enough wallet balance
    const user = (await db.user.findUnique({
      where: { id: requesterId },
    })) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    if (user.walletBalance < numFee) {
      return NextResponse.json(
        {
          success: false,
          message: "Yetersiz bakiye. Lütfen cüzdanınıza para yükleyin.",
        },
        { status: 400 }
      );
    }

    // Create task
    const task = await db.task.create({
      data: {
        title,
        description,
        city,
        district: district || "",
        category,
        fee,
        dueDate: dueDate || "",
        latitude: latitude || 36.8841,
        longitude: longitude || 30.7056,
        requesterId,
      },
    });

    // Deduct fee from wallet and create escrow_block transaction
    await db.user.update({
      where: { id: requesterId },
      data: {
        walletBalance: { decrement: fee },
        escrowBalance: { increment: fee },
      },
    });

    await db.transaction.create({
      data: {
        userId: requesterId,
        taskId: task.id,
        taskTitle: task.title,
        amount: fee,
        type: "escrow_block",
        status: "completed",
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json(
      { success: false, message: "Görev oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}