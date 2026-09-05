import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCommissionSettings, calculateCommission } from "@/lib/commission";
import { requireUser } from "@/lib/security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
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
    if (task.requesterId !== auth.user!.id && task.assignedToId !== auth.user!.id && auth.user!.role !== "admin") {
      return NextResponse.json({ success: false, message: "Bu görevin detaylarına erişim yok" }, { status: 403 });
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
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      category,
      fee,
      city,
      district,
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
    if (task.requesterId !== auth.user!.id && task.assignedToId !== auth.user!.id && auth.user!.role !== "admin") {
      return NextResponse.json({ success: false, message: "Bu görevi değiştirme yetkiniz yok" }, { status: 403 });
    }
    if (status === "completed" && task.requesterId !== auth.user!.id && auth.user!.role !== "admin") {
      return NextResponse.json({ success: false, message: "Görevi yalnızca işveren veya yönetici tamamlayabilir" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (fee !== undefined && !isNaN(Number(fee))) {
      const newFeeNum = Number(fee);
      if (newFeeNum !== task.fee && task.requesterId) {
        const diff = newFeeNum - task.fee;
        if (diff > 0) {
          const reqUser = (await db.user.findUnique({ where: { id: task.requesterId } })) as any;
          if (reqUser && reqUser.walletBalance < diff) {
            return NextResponse.json(
              { success: false, message: "İşverenin cüzdan bakiyesi yeni teklif/fiyat artışını karşılamak için yetersiz." },
              { status: 400 }
            );
          }
          await db.user.update({
            where: { id: task.requesterId },
            data: {
              walletBalance: { decrement: diff },
              escrowBalance: { increment: diff },
            },
          });
          await db.transaction.create({
            data: {
              userId: task.requesterId,
              taskId: task.id,
              taskTitle: task.title,
              amount: diff,
              platformFee: 0,
              type: "escrow_block",
              status: "completed",
            },
          });
        } else if (diff < 0) {
          const refund = Math.abs(diff);
          await db.user.update({
            where: { id: task.requesterId },
            data: {
              walletBalance: { increment: refund },
              escrowBalance: { decrement: refund },
            },
          });
          await db.transaction.create({
            data: {
              userId: task.requesterId,
              taskId: task.id,
              taskTitle: task.title,
              amount: refund,
              platformFee: 0,
              type: "wallet_load",
              status: "completed",
            },
          });
        }
      }
      updateData.fee = newFeeNum;
    }
    if (city) updateData.city = city;
    if (district !== undefined) updateData.district = district;
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
      if (updateData.fee !== undefined) coreData.fee = updateData.fee;

      updatedTask = (await db.task.update({
        where: { id },
        data: coreData,
      })) as any;
    }

    const targetAssigneeId = updatedTask.assignedToId || task.assignedToId;
    const finalFee = typeof updatedTask?.fee === "number" ? updatedTask.fee : task.fee;

    // Create DB notifications for both Requester and Worker based on status change
    if (status) {
      // Notify Requester
      if (task.requesterId) {
        let reqTitle = "";
        let reqMsg = "";
        if (status === "assigned" || status === "in_progress") {
          reqTitle = "Görev Üstlenildi";
          reqMsg = `"${task.title}" göreviniz ${assignedToName || "görevli"} tarafından üstlenildi.`;
        } else if (status === "delivered") {
          reqTitle = "Görev Teslim Edildi! 📦";
          reqMsg = `"${task.title}" görevi görevli tarafından tamamlandı. Lütfen kontrol edip onaylayın.`;
        } else if (status === "completed") {
          reqTitle = "Görev Başarıyla Tamamlandı 🎉";
          reqMsg = `"${task.title}" görevi başarıyla onaylandı ve ${finalFee.toLocaleString("tr-TR")} ₺ tutarındaki ödeme görevliye aktarıldı.`;
        } else if (status === "cancelled") {
          reqTitle = "Görev İptal Edildi";
          reqMsg = `"${task.title}" görevi iptal edildi. ${finalFee.toLocaleString("tr-TR")} ₺ cüzdanınıza iade edildi.`;
        }

        if (reqTitle) {
          await db.notification.create({
            data: {
              userId: task.requesterId,
              title: reqTitle,
              message: reqMsg,
              type: status === "completed" ? "success" : "info",
              read: false,
            },
          }).catch(() => {});
        }
      }

      // Notify Assigned Worker
      if (targetAssigneeId) {
        let wrkTitle = "";
        let wrkMsg = "";
        if (status === "assigned" || status === "in_progress") {
          wrkTitle = "Tebrikler! Görev Size Atandı 🎯";
          wrkMsg = `"${task.title}" görevi başvurunuz kabul edildi ve size atandı. Görev bedeli: ${finalFee.toLocaleString("tr-TR")} ₺.`;
        } else if (status === "delivered") {
          wrkTitle = "Teslimat Bildirimi Gönderildi ⏳";
          wrkMsg = `"${task.title}" görevi teslim edildi. İşverenin onayı bekleniyor.`;
        } else if (status === "completed") {
          wrkTitle = "Tebrikler! Ödemeniz Cüzdanınıza Aktarıldı 💰";
          wrkMsg = `"${task.title}" görevi işveren tarafından onaylandı. Kazancınız cüzdanınıza aktarıldı.`;
        } else if (status === "cancelled") {
          wrkTitle = "Görev İptal Edildi ❌";
          wrkMsg = `"${task.title}" görevi iptal edildi.`;
        }

        if (wrkTitle) {
          await db.notification.create({
            data: {
              userId: targetAssigneeId,
              title: wrkTitle,
              message: wrkMsg,
              type: status === "completed" ? "success" : "info",
              read: false,
            },
          }).catch(() => {});
        }
      }
    }

    // If task is being completed, release escrow to tasker with commission deduction based on finalFee
    if (status === "completed" && targetAssigneeId) {
      const settings = await getCommissionSettings();
      const commission = calculateCommission(finalFee, settings);
      const netAmount = finalFee - commission;

      // Release escrow from requester
      await db.user.update({
        where: { id: task.requesterId },
        data: { escrowBalance: { decrement: finalFee } },
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

    // If task is cancelled, refund escrow back to requester's wallet based on finalFee
    if (status === "cancelled" && task.status !== "completed" && task.status !== "cancelled") {
      // Refund escrow from requester
      await db.user.update({
        where: { id: task.requesterId },
        data: {
          escrowBalance: { decrement: finalFee },
          walletBalance: { increment: finalFee },
        },
      });

      // Create admin_adjust refund transaction
      await db.transaction.create({
        data: {
          userId: task.requesterId,
          taskId: task.id,
          taskTitle: `${task.title} - İptal İadesi`,
          amount: finalFee,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id } });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Görev bulunamadı" },
        { status: 404 }
      );
    }
    if (task.requesterId !== auth.user!.id && auth.user!.role !== "admin") {
      return NextResponse.json({ success: false, message: "Bu görevi silme yetkiniz yok" }, { status: 403 });
    }

    // Refund escrow balance to requester if task was active
    if (task.status !== "completed" && task.status !== "cancelled" && task.requesterId) {
      await db.user
        .update({
          where: { id: task.requesterId },
          data: {
            escrowBalance: { decrement: task.fee },
            walletBalance: { increment: task.fee },
          },
        })
        .catch(() => {});
    }

    // Delete associated bids and messages
    await db.bid.deleteMany({ where: { taskId: id } }).catch(() => {});
    await db.message.deleteMany({ where: { taskId: id } }).catch(() => {});

    // Delete task itself
    await db.task.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Görev başarıyla silindi",
    });
  } catch (error) {
    console.error("Task DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Görev silinirken hata oluştu" },
      { status: 500 }
    );
  }
}