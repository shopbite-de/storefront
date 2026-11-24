import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentDirs } from "../../modules/locale";

/** A project of layers (shop first, storefront last) on disk. */
function layers(...dirs: { content?: string[]; config?: boolean }[]) {
  const root = mkdtempSync(join(tmpdir(), "content-dirs-"));
  const rootDirs = dirs.map((dir, index) => {
    const rootDir = join(root, String(index));
    mkdirSync(join(rootDir, "content"), { recursive: true });
    for (const folder of dir.content ?? []) {
      mkdirSync(join(rootDir, "content", folder));
    }
    if (dir.config) writeFileSync(join(rootDir, "content.config.ts"), "");
    return rootDir;
  });
  return {
    options: {
      rootDir: rootDirs[0]!,
      _layers: rootDirs.map((rootDir) => ({ config: { rootDir } })),
    },
  } as unknown as Parameters<typeof contentDirs>[0];
}

describe("contentDirs", () => {
  it("reads a German shop's pages at the top, without other locales' folders", () => {
    expect(contentDirs(layers({ config: true }), "de", ["de", "en"])).toEqual({
      dir: "",
      exclude: ["en"],
    });
  });

  it("reads the storefront's English folder for an English build", () => {
    const project = layers({ config: true, content: ["en"] });
    expect(contentDirs(project, "en", ["de", "en"])).toEqual({
      dir: "en",
      exclude: [],
    });
  });

  it("reads an English shop's own pages at the top of its folder", () => {
    // the shop's content.config wins; the storefront's en/ is not its folder
    const project = layers({ config: true }, { config: true, content: ["en"] });
    expect(contentDirs(project, "en", ["de", "en"])).toEqual({
      dir: "",
      exclude: ["de"],
    });
  });

  it("falls back to the storefront's folder for a shop without content config", () => {
    const project = layers({}, { config: true, content: ["en"] });
    expect(contentDirs(project, "en", ["de", "en"]).dir).toBe("en");
  });
});
