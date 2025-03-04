import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const filePath = path.join(process.cwd(), "src/app/db/chatbot.json");

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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json(); // expecting { messages: Message[], title?: string }
  const sessionsData = await readSessions();
  const session = sessionsData.sessions.find((s: any) => s.id === id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  session.messages = body.messages;
  if (body.title) {
    session.title = body.title;
  }
  await writeSessions(sessionsData);
  return NextResponse.json(session);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const sessionsData = await readSessions();
  const initialCount = sessionsData.sessions.length;
  sessionsData.sessions = sessionsData.sessions.filter((s: any) => s.id !== id);
  if (sessionsData.sessions.length === initialCount) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  await writeSessions(sessionsData);
  return NextResponse.json({ message: "Session deleted" });
}
