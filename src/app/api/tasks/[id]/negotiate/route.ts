import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/security";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const { id: taskId } = await params;
    const body = await request.json();
    const { messageId, action } = body;

    if (!messageId || !action || (action !== "accept" && action !== "reject")) {
      return NextResponse.json(
        { success: false, message: "Geçersiz parametreler: messageId, action ('accept' | 'reject') zorunludur" },
        { status: 400 }
      );
    }

    // 1. Fetch negotiation message
    const msg = (await db.message.findMany({
      where: { id: messageId },
    }))[0] as any;

    if (!msg || !msg.isNegotiation || msg.negotiationStatus !== "pending") {
      return NextResponse.json(
        { success: false, message: "Geçersiz veya süresi dolmuş pazarlık talebi" },
        { status: 400 }
      );
    }

    // 2. Fetch task details
    const task = (await db.task.findUnique({
      where: { id: taskId },
    })) as any;

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Görev bulunamadı" },
        { status: 404 }
      );
    }
    if (task.requesterId !== auth.user!.id && task.assignedToId !== auth.user!.id && auth.user!.role !== "admin") {
      return NextResponse.json({ success: false, message: "Bu görevde pazarlık yetkiniz yok" }, { status: 403 });
    }

    if (action === "reject") {
      // Mark message as rejected
      await (db.message as any).update({
        where: { id: messageId },
        data: { negotiationStatus: "rejected" },
      });

      // Notify the sender
      await db.notification.create({
        data: {
          userId: msg.senderId,
          title: "Pazarlık Reddedildi",
          message: `"${task.title}" görevi için sunduğunuz pazarlık teklifi karşı tarafça reddedildi.`,
          type: "warning",
        },
      });

      return NextResponse.json({ success: true, message: "Pazarlık teklifi reddedildi" });
    }

    // action === "accept"
    const newFee = msg.negotiationPrice;
    const oldFee = task.fee;
    const difference = newFee - oldFee;

    // Fetch requester (employer)
    const requester = (await db.user.findUnique({
      where: { id: task.requesterId },
    })) as any;

    if (!requester) {
      return NextResponse.json(
        { success: false, message: "İşveren hesabı bulunamadı" },
        { status: 404 }
      );
    }

    // If price increased, check wallet balance of employer
    if (difference > 0) {
      if (requester.walletBalance < difference) {
        return NextResponse.json(
          { success: false, message: "İşverenin cüzdan bakiyesi bu pazarlık artışını karşılamak için yetersiz." },
          { status: 400 }
        );
      }

      // Deduct from wallet, add to escrow
      await db.user.update({
        where: { id: task.requesterId },
        data: {
          walletBalance: requester.walletBalance - difference,
          escrowBalance: requester.escrowBalance + difference,
        },
      });

      // Create escrow block transaction log
      await db.transaction.create({
        data: {
          userId: task.requesterId,
          taskId: task.id,
          taskTitle: task.title,
          amount: difference,
          platformFee: 0,
          type: "escrow_block",
          status: "completed",
        },
      });
    } else if (difference < 0) {
      // Price decreased, refund difference to employer wallet from escrow
      const refund = Math.abs(difference);
      
      await db.user.update({
        where: { id: task.requesterId },
        data: {
          walletBalance: requester.walletBalance + refund,
          escrowBalance: Math.max(0, requester.escrowBalance - refund),
        },
      });

      // Create escrow refund transaction log (using admin_adjust or escrow_release with negative value)
      await db.transaction.create({
        data: {
          userId: task.requesterId,
          taskId: task.id,
          taskTitle: task.title,
          amount: refund,
          platformFee: 0,
          type: "wallet_load", // refunding back to wallet
          status: "completed",
        },
      });
    }

    // Update message status to accepted
    await (db.message as any).update({
      where: { id: messageId },
      data: { negotiationStatus: "accepted" },
    });

    // Update task fee
    await db.task.update({
      where: { id: taskId },
      data: { fee: newFee },
    });

    // Create system notification message inside chat to log the change
    await db.message.create({
      data: {
        taskId: task.id,
        senderId: "system",
        senderName: "Sistem",
        receiverId: task.assignedToId || task.requesterId,
        content: `Görev bütçesi pazarlık sonucu ${oldFee.toLocaleString("tr-TR")} ₺ değerinden ${newFee.toLocaleString("tr-TR")} ₺ olarak güncellendi.`,
      },
    });

    // Create app notifications for both parties
    await db.notification.create({
      data: {
        userId: task.requesterId,
        title: "Pazarlık Anlaşması Sağlandı",
        message: `"${task.title}" görevinin bütçesi ${newFee} ₺ olarak güncellendi.`,
        type: "success",
      },
    });

    if (task.assignedToId) {
      await db.notification.create({
        data: {
          userId: task.assignedToId,
          title: "Pazarlık Anlaşması Sağlandı",
          message: `"${task.title}" görevinin bütçesi ${newFee} ₺ olarak güncellendi.`,
          type: "success",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Pazarlık başarıyla onaylandı ve bütçe güncellendi",
      newFee,
    });
  } catch (error) {
    console.error("Negotiate route error:", error);
    return NextResponse.json(
      { success: false, message: "Pazarlık işlemi sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
