import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
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
        password,
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

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Kayıt olurken hata oluştu" },
      { status: 500 }
    );
  }
}