// Функция Vercel: POST /api/style
import { handleStyle } from "../server/style.js";

export const config = { maxDuration: 60 };

export async function POST(request: Request): Promise<Response> {
  return handleStyle(request, process.env);
}
