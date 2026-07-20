import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCommissionSettings, calculateCommission } from "@/lib/commission";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
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
        assignee: {
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
        bids: {
          orderBy: { createdAt: "desc" },
          include: {
            tasker: {
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
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Görev bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Task detail GET error:", error);
    return NextResponse.json(
      { success: false, message: "Görev detayı yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      assignedToId,
      assignedToName,
      evidencePhoto,
      evidenceDescription,
      evidenceLocation,
      disputeReason,
    } = body;

    const task = (await db.task.findUnique({ where: { id } })) as any;

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Görev bulunamadı" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (assignedToName !== undefined) updateData.assignedToName = assignedToName;
    if (evidencePhoto !== undefined) updateData.evidencePhoto = evidencePhoto;
    if (evidenceDescription !== undefined) updateData.evidenceDescription = evidenceDescription;
    if (evidenceLocation !== undefined) updateData.evidenceLocation = evidenceLocation;
    if (disputeReason !== undefined) {
      updateData.disputeReason = disputeReason;
      updateData.disputedAt = new Date().toISOString();
    }

    let updatedTask;
    try {
      updatedTask = (await db.task.update({
        where: { id },
        data: updateData,
      })) as any;
    } catch (dbErr) {
      console.error("Primary task update failed, retrying with core fields:", dbErr);
      const coreData: Record<string, unknown> = {};
      if (status) coreData.status = status;
      if (assignedToId !== undefined) coreData.assignedToId = assignedToId;
      if (assignedToName !== undefined) coreData.assignedToName = assignedToName;

      updatedTask = (await db.task.update({
        where: { id },
        data: coreData,
      })) as any;
    }

    const targetAssigneeId = updatedTask.assignedToId || task.assignedToId;

    // If task is being completed, release escrow to tasker with commission deduction
    if (status === "completed" && targetAssigneeId) {
      const settings = await getCommissionSettings();
      const commission = calculateCommission(task.fee, settings);
      const netAmount = task.fee - commission;

      // Release escrow from requester
      await db.user.update({
        where: { id: task.requesterId },
        data: { escrowBalance: { decrement: task.fee } },
      });

      // Add net amount to tasker's wallet (after commission)
      await db.user.update({
        where: { id: targetAssigneeId },
        data: {
          walletBalance: { increment: netAmount },
          completedTasksCount: { increment: 1 },
        },
      });

      // Create escrow_release transaction with platformFee
      await db.transaction.create({
        data: {
          userId: targetAssigneeId,
          taskId: task.id,
          taskTitle: task.title,
          amount: netAmount,
          platformFee: commission,
          type: "escrow_release",
          status: "completed",
        },
      });

      // Create platform_commission transaction for tracking
      if (commission > 0) {
        await db.transaction.create({
          data: {
            userId: targetAssigneeId,
            taskId: task.id,
            taskTitle: `${task.title} - Platform Komisyonu`,
            amount: commission,
            platformFee: 0,
            type: "platform_commission",
            status: "completed",
          },
        });
      }
    }

    // If task is cancelled, refund escrow back to requester's wallet
    if (status === "cancelled" && task.status !== "completed" && task.status !== "cancelled") {
      // Refund escrow from requester
      await db.user.update({
        where: { id: task.requesterId },
        data: {
          escrowBalance: { decrement: task.fee },
          walletBalance: { increment: task.fee },
        },
      });

      // Create admin_adjust refund transaction
      await db.transaction.create({
        data: {
          userId: task.requesterId,
          taskId: task.id,
          taskTitle: `${task.title} - İptal İadesi`,
          amount: task.fee,
          platformFee: 0,
          type: "admin_adjust",
          status: "completed",
        },
      });
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Task PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Görev güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}