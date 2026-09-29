import { readFileSync, mkdtempSync } from "node:fs";
import Module from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

export function compileTsModule(rel, stubs = {}) {
  const source = readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const filename = join(mkdtempSync(join(tmpdir(), "contract-ts-module-")), `${rel}.cjs`);
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => (id in stubs ? stubs[id] : originalRequire(id));
  mod._compile(outputText, filename);
  return mod.exports;
}
