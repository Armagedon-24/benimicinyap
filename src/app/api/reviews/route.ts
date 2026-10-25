import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/security';

// GET /api/reviews?taskId=xxx&userId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const userId = searchParams.get('userId'); // user whose received reviews we want

    if (userId) {
      const reviews = await db.review.findMany({
        where: { toUserId: userId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, reviews });
    }

    if (taskId) {
      const reviews = await db.review.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, reviews });
    }

    return NextResponse.json({ success: false, message: 'taskId veya userId gerekli' }, { status: 400 });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({ success: false, message: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST /api/reviews — submit a rating
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;
    const body = await req.json();
    const { taskId, fromUserName, toUserId, toUserName, rating, comment, fromRole } = body;
    const fromUserId = auth.user!.id;

    if (!taskId || !fromUserId || !toUserId || !rating) {
      return NextResponse.json({ success: false, message: 'Eksik alanlar' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: 'Puan 1-5 arası olmalı' }, { status: 400 });
    }

    // Check if already reviewed this task from this user
    const existing = await db.review.findFirst({
      where: { taskId, fromUserId },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Bu görev için zaten puan verdiniz' }, { status: 400 });
    }

    // Get task title
    const task: any = await db.task.findUnique({ where: { id: taskId } });
    if (!task || (task.requesterId !== fromUserId && task.assignedToId !== fromUserId) || (toUserId !== task.requesterId && toUserId !== task.assignedToId)) {
      return NextResponse.json({ success: false, message: 'Bu görev için yorum yetkiniz yok' }, { status: 403 });
    }

    // Create review
    const review = await db.review.create({
      data: {
        taskId,
        taskTitle: task?.title || '',
        fromUserId,
        fromUserName,
        toUserId,
        toUserName,
        rating: Math.round(rating),
        comment: comment || '',
        fromRole: fromRole || 'requester',
      },
    });

    // Recalculate target user's rating
    const allReviews: any[] = await db.review.findMany({ where: { toUserId } });
    const totalRating = allReviews.reduce((sum: number, r: any) => sum + (r.rating as number), 0);
    const avgRating = allReviews.length > 0 ? Math.round((totalRating / allReviews.length) * 10) / 10 : 5.0;

    // Update user's rating and review count
    const userBefore = await db.user.findUnique({ where: { id: toUserId } });
    if (userBefore) {
      await db.user.update({
        where: { id: toUserId },
        data: {
          rating: avgRating,
          totalReviews: allReviews.length,
        },
      });
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Review create error:', error);
    return NextResponse.json({ success: false, message: 'Sunucu hatası' }, { status: 500 });
  }
}