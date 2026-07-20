import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCommissionSettings } from "@/lib/commission";

export async function GET() {
  try {
    // Total platform commission earned
    const commissionTxs: any[] = await db.transaction.findMany({
      where: { type: "platform_commission", status: "completed" },
    });
    const totalCommissionEarned = commissionTxs.reduce((sum: number, t: any) => sum + (t.amount as number), 0);

    // Commission from escrow_release transactions (platformFee field)
    const releaseTxs: any[] = await db.transaction.findMany({
      where: { type: "escrow_release", status: "completed" },
    });
    const totalPlatformFees = releaseTxs.reduce((sum: number, t: any) => sum + (t.platformFee as number || 0), 0);

    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCommissionTxs = commissionTxs.filter(
      (t: any) => new Date(t.createdAt as string) >= today
    );
    const todayReleaseTxs = releaseTxs.filter(
      (t: any) => new Date(t.createdAt as string) >= today
    );
    const todayRevenue =
      todayCommissionTxs.reduce((s: number, t: any) => s + (t.amount as number), 0) +
      todayReleaseTxs.reduce((s: number, t: any) => s + (t.platformFee as number || 0), 0);

    // This month's revenue
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthCommissionTxs = commissionTxs.filter(
      (t: any) => new Date(t.createdAt as string) >= monthStart
    );
    const monthReleaseTxs = releaseTxs.filter(
      (t: any) => new Date(t.createdAt as string) >= monthStart
    );
    const monthRevenue =
      monthCommissionTxs.reduce((s: number, t: any) => s + (t.amount as number), 0) +
      monthReleaseTxs.reduce((s: number, t: any) => s + (t.platformFee as number || 0), 0);

    // Total tasks completed with commission
    const tasksWithCommission = await db.transaction.count({
      where: {
        OR: [
          { type: "platform_commission", status: "completed" },
          { type: "escrow_release", platformFee: { gt: 0 }, status: "completed" },
        ],
      },
    });

    // Withdrawal fees collected
    const withdrawTxs: any[] = await db.transaction.findMany({
      where: { type: "wallet_withdraw", status: "completed" },
    });
    const totalWithdrawFees = withdrawTxs.reduce(
      (s: number, t: any) => s + (t.platformFee as number || 0),
      0
    );

    // Listing fees collected
    const listingTxs: any[] = await db.transaction.findMany({
      where: { type: "escrow_block", platformFee: { gt: 0 }, status: "completed" },
    });
    const totalListingFees = listingTxs.reduce(
      (s: number, t: any) => s + (t.platformFee as number || 0),
      0
    );

    // Total gross platform revenue
    const totalRevenue = totalCommissionEarned + totalWithdrawFees + totalListingFees;

    // Average commission per task
    const avgCommission =
      tasksWithCommission > 0 ? totalRevenue / tasksWithCommission : 0;

    // Recent revenue transactions
    const recentRevenue = await db.transaction.findMany({
      where: {
        OR: [
          { type: "platform_commission" },
          { platformFee: { gt: 0 } },
        ],
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Monthly revenue breakdown (last 6 months)
    const monthlyData: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const mCommissions = commissionTxs.filter(
        (t: any) => new Date(t.createdAt as string) >= mStart && new Date(t.createdAt as string) < mEnd
      );
      const mFees = releaseTxs.filter(
        (t: any) => new Date(t.createdAt as string) >= mStart && new Date(t.createdAt as string) < mEnd
      );
      const mTotal =
        mCommissions.reduce((s: number, t: any) => s + (t.amount as number), 0) +
        mFees.reduce((s: number, t: any) => s + (t.platformFee as number || 0), 0);
      monthlyData.push({
        month: mStart.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
        revenue: mTotal,
        count: mCommissions.length + mFees.length,
      });
    }

    // Current commission settings
    const settings = await getCommissionSettings();

    return NextResponse.json({
      success: true,
      revenue: {
        totalRevenue,
        todayRevenue,
        monthRevenue,
        totalCommissionEarned,
        totalPlatformFees,
        totalWithdrawFees,
        totalListingFees,
        tasksWithCommission,
        avgCommission,
        monthlyData,
        recentRevenue,
        currentSettings: {
          commissionRate: settings.commissionRate,
          commissionMode: settings.commissionMode,
          commissionPayer: settings.commissionPayer,
        },
      },
    });
  } catch (error) {
    console.error("Revenue GET error:", error);
    return NextResponse.json(
      { success: false, message: "Gelir verileri yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}