// Функция Vercel: GET/POST /api/unlock (платный режим по паролю)
import { handleUnlock } from "../server/auth.js";

export const config = { maxDuration: 30 };

export async function POST(request: Request): Promise<Response> {
  return handleUnlock(request, process.env);
}

export async function GET(request: Request): Promise<Response> {
  return handleUnlock(request, process.env);
}
