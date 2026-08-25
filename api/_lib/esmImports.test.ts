import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function typescriptFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = resolve(root, entry);
    if (statSync(path).isDirectory()) return typescriptFiles(path);
    return extname(path) === ".ts" && !path.endsWith(".d.ts") ? [path] : [];
  });
}

function relativeSpecifiers(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const pattern = /(?:from\s+|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g;
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

describe("imports ESM das Vercel Serverless Functions", () => {
  it("usa extensões explícitas em toda a árvore server-side", () => {
    const roots = [resolve("api"), resolve("src/lib/crm")];
    const invalid: string[] = [];

    roots.flatMap(typescriptFiles).forEach((file) => {
      relativeSpecifiers(file).forEach((specifier) => {
        const withoutQuery = specifier.split("?")[0];
        if (![".js", ".json", ".node", ".sql"].includes(extname(withoutQuery))) {
          invalid.push(`${file}: ${specifier}`);
        }
      });
    });

    expect(invalid, "Imports relativos sem extensão ESM explícita").toEqual([]);
  });

  it("aponta cada import .js para um módulo TypeScript existente", () => {
    const roots = [resolve("api"), resolve("src/lib/crm")];
    const missing: string[] = [];

    roots.flatMap(typescriptFiles).forEach((file) => {
      relativeSpecifiers(file)
        .filter((specifier) => specifier.endsWith(".js"))
        .forEach((specifier) => {
          const typescriptTarget = resolve(
            dirname(file),
            specifier.replace(/\.js$/, ".ts")
          );
          if (!existsSync(typescriptTarget)) {
            missing.push(`${file}: ${specifier}`);
          }
        });
    });

    expect(missing, "Imports .js sem arquivo-fonte .ts correspondente").toEqual([]);
  });
});
