// Функция Vercel: POST /api/tryon
import { handleTryOn } from "../server/tryon";

export const config = { maxDuration: 300 };

export async function POST(request: Request): Promise<Response> {
  return handleTryOn(request, process.env);
}

export async function GET(request: Request): Promise<Response> {
  return handleTryOn(request, process.env);
}
