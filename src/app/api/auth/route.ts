import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowRateLimit, hashPassword, isPasswordHash, setSession, verifyPassword } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    if (!allowRateLimit(request, "login", 10)) {
      return NextResponse.json({ success: false, message: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    }
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "E-posta ve şifre zorunludur" },
        { status: 400 }
      );
    }

    const user: any = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { success: false, message: "Şifre hatalı" },
        { status: 401 }
      );
    }

    if (!isPasswordHash(user.password)) {
      await db.user.update({ where: { id: user.id }, data: { password: hashPassword(password) } });
    }

    const { password: _, ...userWithoutPassword } = user;
    const response = NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
    return setSession(response, user.id);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Giriş yapılırken hata oluştu" },
      { status: 500 }
    );
  }
}