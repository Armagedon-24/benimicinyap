import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearSettingsCache } from "@/lib/commission";
import { clearAiGuardCache } from "@/lib/ai-guard";
import { requireAdmin } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const settings = await db.platformSetting.findMany({
      orderBy: { group: "asc" },
    });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { success: false, message: "Ayarlar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, message: "Ayarlar dizisi gerekli" },
        { status: 400 }
      );
    }

    const updated: any[] = [];
    for (const s of settings) {
      if (!s.key) continue;
      const existing = await db.platformSetting.findUnique({
        where: { key: s.key },
      });
      if (existing) {
        const u = await db.platformSetting.update({
          where: { key: s.key },
          data: { value: String(s.value) },
        });
        updated.push(u);
      }
    }

    clearSettingsCache();
    clearAiGuardCache();
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Ayarlar güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}