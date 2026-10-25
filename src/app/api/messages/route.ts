import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/security";
import { notifyNewTaskMessage } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { success: false, message: "taskId zorunludur" },
        { status: 400 }
      );
    }

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || (task.requesterId !== auth.user!.id && task.assignedToId !== auth.user!.id)) {
      return NextResponse.json({ success: false, message: "Bu görevin mesajlarına erişim yok" }, { status: 403 });
    }
    const messages = await db.message.findMany({
      where: { taskId, OR: [{ senderId: auth.user!.id }, { receiverId: auth.user!.id }] },
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
    const auth = await requireUser(request);
    const body = await request.json();
    if (auth.response) return auth.response;
    const { taskId, senderName, content, receiverId, isNegotiation, negotiationPrice, negotiationStatus } = body;
    const senderId = auth.user!.id;

    if (!taskId || !senderId || !content || !receiverId) {
      return NextResponse.json(
        {
          success: false,
          message: "Zorunlu alanlar: taskId, senderId, content, receiverId",
        },
        { status: 400 }
      );
    }

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || (task.requesterId !== senderId && task.assignedToId !== senderId)) {
      return NextResponse.json({ success: false, message: "Bu göreve mesaj gönderme yetkiniz yok" }, { status: 403 });
    }
    if (receiverId !== task.requesterId && receiverId !== task.assignedToId) {
      return NextResponse.json({ success: false, message: "Geçersiz mesaj alıcısı" }, { status: 400 });
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

    // E-posta bildirimi: SMTP env ile yapılandırılmışsa alıcının e-postasına iletilir.
    // Yapılandırma yoksa sessizce atlanır; hata mesaj gönderimini etkilemez.
    try {
      const [receiver, sender] = await Promise.all([
        db.user.findUnique({ where: { id: receiverId }, select: { email: true, fullName: true } }),
        db.user.findUnique({ where: { id: senderId }, select: { fullName: true } }),
      ]);
      if (receiver?.email && receiverId !== senderId) {
        const mailResult = await notifyNewTaskMessage({
          receiverEmail: receiver.email,
          receiverName: receiver.fullName || "",
          senderName: sender?.fullName || senderName || "Bir kullanıcı",
          taskTitle: task.title,
          content,
        });
        if (!mailResult.sent) {
          console.warn("[messages] e-posta bildirimi atlandı/başarısız:", mailResult.error || mailResult.skipped);
        }
      }
    } catch (mailErr) {
      console.warn("[messages] e-posta bildirimi hatası:", mailErr);
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { success: false, message: "Mesaj gönderilirken hata oluştu" },
      { status: 500 }
    );
  }
}