import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const filePath = path.join(process.cwd(), "src/app/db/codeGen.json");

async function readSessions() {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return { sessions: [] };
  }
}

async function writeSessions(data: any) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const sessions = await readSessions();
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = await request.json(); // expecting { title: string }
  const sessionsData = await readSessions();
  const newSession = {
    id: Date.now().toString(),
    title: body.title || "New CodeGen Session",
    messages: [],
  };
  sessionsData.sessions.push(newSession);
  await writeSessions(sessionsData);
  return NextResponse.json(newSession);
}
