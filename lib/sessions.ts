import { getDb, persist } from "./db";
import type { ChatResponse } from "@/lib/schemas/response";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface SessionMeta {
  id: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export async function getSessions(): Promise<SessionMeta[]> {
  const db = await getDb();
  const results = db.exec(
    "SELECT id, title, messages, created_at, updated_at FROM sessions ORDER BY updated_at DESC"
  );
  if (results.length === 0) return [];
  return results[0].values.map((row) => ({
    id: row[0] as string,
    title: row[1] as string,
    messageCount: (JSON.parse(row[2] as string) as Message[]).length,
    createdAt: row[3] as number,
    updatedAt: row[4] as number,
  }));
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDb();
  const results = db.exec(
    "SELECT id, title, messages, created_at, updated_at FROM sessions WHERE id = ?",
    [id]
  );
  if (results.length === 0 || results[0].values.length === 0) return undefined;
  const row = results[0].values[0];
  return {
    id: row[0] as string,
    title: row[1] as string,
    messages: JSON.parse(row[2] as string) as Message[],
    createdAt: row[3] as number,
    updatedAt: row[4] as number,
  };
}

export async function createSession(): Promise<Session> {
  const db = await getDb();
  const now = Date.now();
  const id = `s_${now}_${Math.random().toString(36).slice(2, 6)}`;
  db.run(
    "INSERT INTO sessions (id, title, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [id, "New Chat", "[]", now, now]
  );
  persist(db);
  return { id, title: "New Chat", messages: [], createdAt: now, updatedAt: now };
}

export async function updateSession(
  id: string,
  updates: { title?: string; messages?: Message[] }
) {
  const db = await getDb();
  const now = Date.now();
  if (updates.title !== undefined) {
    db.run("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?", [
      updates.title,
      now,
      id,
    ]);
  }
  if (updates.messages !== undefined) {
    db.run("UPDATE sessions SET messages = ?, updated_at = ? WHERE id = ?", [
      JSON.stringify(updates.messages),
      now,
      id,
    ]);
  }
  persist(db);
}

export async function deleteSession(id: string) {
  const db = await getDb();
  db.run("DELETE FROM sessions WHERE id = ?", [id]);
  persist(db);
}

export function deriveTitle(firstMessage: string): string {
  const clean = firstMessage.replace(/\s+/g, " ").trim();
  if (clean.length <= 40) return clean;
  return clean.slice(0, 37) + "...";
}
