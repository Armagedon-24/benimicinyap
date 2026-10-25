import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/security";
import { runAiProofCheck } from "@/lib/ai-proof-check";

// POST: re-run the AI proof authenticity check for a task (requester or admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const { id } = await params;

    const task = (await db.task.findUnique({ where: { id } })) as any;
    if (!task) {
      return NextResponse.json({ success: false, message: "Görev bulunamadı" }, { status: 404 });
    }
    if (task.requesterId !== auth.user!.id && auth.user!.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Taramayı yalnızca işveren veya yönetici başlatabilir" },
        { status: 403 }
      );
    }
    if (!task.evidencePhoto && !task.evidenceDescription) {
      return NextResponse.json(
        { success: false, message: "Taranacak kanıt bulunamadı" },
        { status: 400 }
      );
    }

    const result = await runAiProofCheck(id);
    const updated = (await db.task.findUnique({
      where: { id },
      select: {
        aiCheckVerdict: true,
        aiCheckScore: true,
        aiCheckReason: true,
        aiCheckSignals: true,
        aiCheckedAt: true,
      },
    })) as any;

    return NextResponse.json({ success: true, result, task: updated });
  } catch (error) {
    console.error("AI proof check POST error:", error);
    return NextResponse.json(
      { success: false, message: "Yapay zeka taraması sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
