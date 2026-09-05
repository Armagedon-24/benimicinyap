import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCommissionSettings, calculateCommission } from "@/lib/commission";
import { requireAdmin } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "users") {
      const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
      });
      // Remove passwords
      const safeUsers = users.map(({ password: _, ...user }) => user);
      return NextResponse.json({ success: true, users: safeUsers });
    }

    if (action === "stats") {
      const totalUsers = await db.user.count();
      const totalTasks = await db.task.count();
      const pendingTasks = await db.task.count({ where: { status: "pending" } });
      const inProgressTasks = await db.task.count({
        where: { status: "in_progress" },
      });
      const assignedTasks = await db.task.count({ where: { status: "assigned" } });
      const completedTasks = await db.task.count({ where: { status: "completed" } });
      const totalBids = await db.bid.count();
      const totalTransactions = await db.transaction.count();

      const transactions: any[] = await db.transaction.findMany({
        select: { amount: true, type: true },
      });

      const totalVolume = transactions.reduce((sum: number, t: any) => sum + (t.amount as number), 0);
      const escrowVolume = transactions
        .filter((t: any) => t.type === "escrow_block")
        .reduce((sum: number, t: any) => sum + (t.amount as number), 0);

      return NextResponse.json({
        success: true,
        stats: {
          totalUsers,
          totalTasks,
          pendingTasks,
          inProgressTasks,
          assignedTasks,
          completedTasks,
          totalBids,
          totalTransactions,
          totalVolume,
          escrowVolume,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Geçersiz işlem. 'users' veya 'stats' kullanın." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { success: false, message: "Yönetici verileri yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const body = await request.json();
    const { action } = body;

    if (action === "adjust-balance") {
      const { userId, amount } = body;
      const numAmount = Number(amount);

      if (!userId || isNaN(numAmount) || !isFinite(numAmount)) {
        return NextResponse.json(
          {
            success: false,
            message: "Geçersiz veya eksik parametreler: userId, amount zorunludur ve sayı olmalıdır.",
          },
          { status: 400 }
        );
      }

      const user = await db.user.findUnique({ where: { id: userId } });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Kullanıcı bulunamadı" },
          { status: 404 }
        );
      }

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: numAmount } },
      });

      // Create admin_adjust transaction
      await db.transaction.create({
        data: {
          userId,
          amount: Math.abs(numAmount),
          type: "admin_adjust",
          status: "completed",
          taskTitle: `Yönetici bakiye ayarlaması (${numAmount > 0 ? "+" : ""}${numAmount} ₺)`,
        },
      });

      const { password: _, ...userWithoutPassword } = updatedUser;

      return NextResponse.json({
        success: true,
        user: userWithoutPassword,
      });
    }

    if (action === "task-status") {
      const { taskId, status, assignedToId, assignedToName } = body;

      if (!taskId || !status) {
        return NextResponse.json(
          {
            success: false,
            message: "Zorunlu alanlar: taskId, status",
          },
          { status: 400 }
        );
      }

      const task: any = await db.task.findUnique({ where: { id: taskId } });

      if (!task) {
        return NextResponse.json(
          { success: false, message: "Görev bulunamadı" },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = { status };
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
      if (assignedToName !== undefined)
        updateData.assignedToName = assignedToName;

      const updatedTask = await db.task.update({
        where: { id: taskId },
        data: updateData,
      });

      // If completing, release escrow with commission
      if (status === "completed" && task.assignedToId) {
        const settings = await getCommissionSettings();
        const commission = calculateCommission(task.fee, settings);
        const netAmount = task.fee - commission;

        await db.user.update({
          where: { id: task.requesterId },
          data: { escrowBalance: { decrement: task.fee } },
        });

        await db.user.update({
          where: { id: task.assignedToId },
          data: {
            walletBalance: { increment: netAmount },
            completedTasksCount: { increment: 1 },
          },
        });

        await db.transaction.create({
          data: {
            userId: task.assignedToId,
            taskId: task.id,
            taskTitle: task.title,
            amount: netAmount,
            platformFee: commission,
            type: "escrow_release",
            status: "completed",
          },
        });

        if (commission > 0) {
          await db.transaction.create({
            data: {
              userId: task.assignedToId,
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

      return NextResponse.json({ success: true, task: updatedTask });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Geçersiz işlem. 'adjust-balance' veya 'task-status' kullanın.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin POST error:", error);
    return NextResponse.json(
      { success: false, message: "Yönetici işlemi sırasında hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı ID zorunludur" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Delete related data first
    await db.message.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    });
    await db.notification.deleteMany({ where: { userId } });
    await db.transaction.deleteMany({ where: { userId } });
    await db.bid.deleteMany({ where: { taskerId: userId } });

    // Reassign tasks from this user
    const assignedTasks: any[] = await db.task.findMany({
      where: { assignedToId: userId },
    });

    for (const task of assignedTasks) {
      await db.task.update({
        where: { id: task.id },
        data: {
          assignedToId: null,
          assignedToName: null,
          status: "pending",
        },
      });
    }

    // Delete user's tasks
    await db.task.deleteMany({ where: { requesterId: userId } });
    await db.paymentCard.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({
      success: true,
      message: "Kullanıcı ve ilgili veriler başarıyla silindi",
    });
  } catch (error) {
    console.error("Admin DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Kullanıcı silinirken hata oluştu" },
      { status: 500 }
    );
  }
}