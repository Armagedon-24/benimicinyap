import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowRateLimit, hashPassword, setSession } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    if (!allowRateLimit(request, "register", 5, 10 * 60_000)) {
      return NextResponse.json({ success: false, message: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    }
    const body = await request.json();
    const { email, password, fullName, city, tcNo, bio } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, message: "E-posta, şifre ve ad soyad zorunludur" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Bu e-posta adresi zaten kayıtlı" },
        { status: 400 }
      );
    }

    const user = await db.user.create({
      data: {
        email,
        password: hashPassword(password),
        fullName,
        city: city || "",
        tcNo: tcNo || "",
        bio: bio || "",
        role: "user",
        paymentVerified: true,
        walletBalance: 5000,
        rating: 5.0,
        totalReviews: 0,
        completedTasksCount: 0,
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
    return setSession(response, user.id);
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Kayıt olurken hata oluştu" },
      { status: 500 }
    );
  }
}