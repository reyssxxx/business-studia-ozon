import { defineConfig, loadEnv, type Plugin, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleTryOn } from "./server/tryon";

// Локально отдаём /api/tryon прямо из Vite (и в dev, и в preview), чтобы не нужен был vercel CLI.
function localApi(env: Record<string, string>): Plugin {
  const mw: Connect.NextHandleFunction = async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const request = new Request("http://localhost" + (req.url ?? "/"), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
    });
    const response = await handleTryOn(request, env);
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  return {
    name: "local-api",
    configureServer(s) {
      s.middlewares.use("/api/tryon", mw);
    },
    configurePreviewServer(s) {
      s.middlewares.use("/api/tryon", mw);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), localApi(env)],
  };
});
