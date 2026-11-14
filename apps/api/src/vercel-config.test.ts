import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

describe("Vercel service ingress", () => {
  it("keeps API traffic separate from SPA deep links and static assets", () => {
    const root = new URL("../../../", import.meta.url);
    const config = JSON.parse(
      readFileSync(new URL("vercel.json", root), "utf8"),
    );
    expect(config.services.mobile.root).toBe("apps/mobile");
    expect(config.services.backend.root).toBe("apps/api");
    for (const service of Object.values(config.services) as {
      root: string;
    }[]) {
      expect(existsSync(new URL(service.root + "/package.json", root))).toBe(
        true,
      );
    }
    expect(config.rewrites).toEqual([
      { source: "/api/:path*", destination: { service: "backend" } },
      { source: "/(.*)", destination: { service: "mobile" } },
    ]);
    expect(config.services.backend.entrypoint).toBe("src/vercel.ts");
    expect(
      existsSync(fileURLToPath(new URL("apps/api/src/vercel.ts", root))),
    ).toBe(true);
    expect(config.services.mobile.outputDirectory).toBe("dist");
    expect(config.services.mobile.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
  });
});
