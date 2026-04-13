import { NextResponse } from "next/server";
import { getSessions, createSession } from "@/lib/sessions";

export async function GET() {
  const sessions = await getSessions();
  return NextResponse.json(sessions);
}

export async function POST() {
  const session = await createSession();
  return NextResponse.json(session);
}
