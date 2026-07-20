import { NextRequest, NextResponse } from 'next/server';
import { db, omitPassword } from '@/lib/db';

// GET /api/users/profile?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId gerekli' }, { status: 400 });
    }

    const user = (await db.user.findUnique({ where: { id: userId } })) as any;
    if (!user) {
      return NextResponse.json({ success: false, message: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Get reviews for this user
    const receivedReviews = (await db.review.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
    })) as any[];

    // Rating breakdown
    const ratingCounts = [0, 0, 0, 0, 0, 0]; // index 0 unused, 1-5
    for (const r of receivedReviews) {
      const star = Math.round(r.rating);
      if (star >= 1 && star <= 5) ratingCounts[star]++;
    }

    return NextResponse.json({
      success: true,
      user: omitPassword(user),
      reviews: receivedReviews,
      ratingBreakdown: ratingCounts,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ success: false, message: 'Sunucu hatası' }, { status: 500 });
  }
}

// PATCH /api/users/profile
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...updateData } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId gerekli' }, { status: 400 });
    }

    // Only allow updating these fields
    const allowedFields = ['fullName', 'city', 'bio', 'darkMode', 'isOnline'];
    const cleanData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updateData) {
        cleanData[key] = updateData[key];
      }
    }

    const updated = (await db.user.update({
      where: { id: userId },
      data: cleanData,
    })) as any;

    return NextResponse.json({ success: true, user: omitPassword(updated) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Sunucu hatası';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}