import { NextRequest, NextResponse } from "next/server";
import { omitPassword } from "@/lib/db";
import { currentUser } from "@/lib/security";

export async function GET(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ success: false, user: null }, { status: 401 });
  return NextResponse.json({ success: true, user: omitPassword(user) });
}