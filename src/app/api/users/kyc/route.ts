import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/security";

// Checks if the T.C. Kimlik Number is mathematically valid using the national checksum algorithm
function validateTCNo(tcNo: string): boolean {
  if (tcNo.length !== 11) return false;
  if (!/^\d+$/.test(tcNo)) return false;
  if (tcNo.charAt(0) === '0') return false;

  const digits = tcNo.split('').map(Number);
  
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  
  const digit10 = (((oddSum * 7) - evenSum) % 10 + 10) % 10;
  if (digit10 !== digits[9]) return false;
  
  const totalSum = digits.slice(0, 10).reduce((acc, curr) => acc + curr, 0);
  if (totalSum % 10 !== digits[10]) return false;
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const body = await request.json();
    const { tcNo, fullName, birthYear } = body;
    const userId = auth.user!.id;

    if (!userId || !tcNo || !fullName || !birthYear) {
      return NextResponse.json(
        { success: false, message: "Eksik parametreler" },
        { status: 400 }
      );
    }

    const tcNoParsed = tcNo.trim();
    if (!validateTCNo(tcNoParsed)) {
      return NextResponse.json(
        { success: false, message: "T.C. Kimlik Numarası geçersizdir (Algoritmik Kontrol Başarısız)." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    if (fullName.trim().split(/\s+/).length < 2) {
      return NextResponse.json(
        { success: false, message: "Lütfen adınızı ve soyadınızı tam giriniz." },
        { status: 400 }
      );
    }

    // Update user status
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        tcNo: tcNoParsed,
        tcVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "T.C. Kimlik doğrulaması ulusal algoritma kontrolüyle başarıyla tamamlandı.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        tcVerified: updatedUser.tcVerified,
        tcNo: updatedUser.tcNo,
      },
    });
  } catch (error) {
    console.error("KYC POST error:", error);
    return NextResponse.json(
      { success: false, message: "Doğrulama işlemi sırasında sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}
