import { defineConfig, loadEnv, type Plugin, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleTryOn } from "./server/tryon";
import { handleStyle } from "./server/style";

// Локально отдаём /api/tryon прямо из Vite (и в dev, и в preview), чтобы не нужен был vercel CLI.
function localApi(env: Record<string, string>): Plugin {
  const make = (handler: (r: Request, e: Record<string, string>) => Promise<Response>): Connect.NextHandleFunction => async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const request = new Request("http://localhost" + (req.url ?? "/"), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
    });
    const response = await handler(request, env);
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  const mount = (s: { middlewares: Connect.Server }) => {
    s.middlewares.use("/api/tryon", make(handleTryOn));
    s.middlewares.use("/api/style", make(handleStyle));
  };
  return { name: "local-api", configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), localApi(env)],
  };
});
