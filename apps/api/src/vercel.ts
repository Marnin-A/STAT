import { createVercelApp } from "./vercel-app.js";

// Vercel's Fastify adapter instruments listen(). This must run when the
// entrypoint is loaded, unlike app.ts's guarded standalone executable.
const app = createVercelApp();
void app
  .listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" })
  .catch((error: unknown) => {
    console.error("STAT service failed to start.", error);
    process.exitCode = 1;
  });
