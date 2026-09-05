import { NextResponse } from "next/server";
import { clearSession } from "@/lib/security";

export async function POST() {
  return clearSession(NextResponse.json({ success: true }));
}