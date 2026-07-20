import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearStore, initStore } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const userCount = await db.user.count();
    if (userCount > 0 && !force) {
      return NextResponse.json({
        success: true,
        message: "Veritabanı zaten dolu, sıfırlama atlandı. Sıfırlamak için ?force=true parametresini kullanın.",
      });
    }

    clearStore();
    initStore();

    return NextResponse.json({
      success: true,
      message:
        "Veritabanı başarıyla sıfırlandı ve demo veriler ile dolduruldu. 6 kullanıcı, 6 görev, 5 teklif, 6 işlem, 6 bildirim, 8 mesaj, 2 ödeme kartı ve komisyon ayarları oluşturuldu.",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, message: "Veritabanı doldurma hatası" },
      { status: 500 }
    );
  }
}