import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/security";

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
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
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
    } = body;

    const numFee = Number(fee);
    if (!title || !description || !city || !category || isNaN(numFee) || numFee <= 0) {
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
      where: { id: auth.user!.id },
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

    const task = await db.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title,
          description,
          city,
          district: district || "",
          category,
          fee: numFee,
          dueDate: dueDate || "",
          latitude: latitude || 36.8841,
          longitude: longitude || 30.7056,
          requesterId: auth.user!.id,
        },
      });
      const debit = await tx.user.updateMany({
        where: { id: auth.user!.id, walletBalance: { gte: numFee } },
        data: { walletBalance: { decrement: numFee }, escrowBalance: { increment: numFee } },
      });
      if (debit.count !== 1) throw new Error("Insufficient wallet balance");
      await tx.transaction.create({
        data: { userId: auth.user!.id, taskId: created.id, taskTitle: created.title, amount: numFee, type: "escrow_block", status: "completed" },
      });
      return created;
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