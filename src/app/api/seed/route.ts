import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearStore, initStore } from "@/lib/db";
import { requireAdmin, securityEvent } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const userCount = await db.user.count();
    if (userCount > 0 && !force) {
      return NextResponse.json({
        success: true,
        message: "Veritabanı zaten dolu, sıfırlama atlandı. Sıfırlamak için ?force=true parametresini kullanın.",
      });
    }

    await clearStore();
    await initStore();
    await securityEvent("database_seed", `force=${force}`, auth.user?.id);

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