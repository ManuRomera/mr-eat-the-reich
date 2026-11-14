import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
// Un error de sintaxis en cualquier módulo (un import repetido, por ejemplo) impide que cargue el sistema entero.
const raiz = fileURLToPath(new URL("..", import.meta.url));
const modulos = ["mr-eat-the-reich.mjs", ...fs.readdirSync(raiz + "module", { recursive: true }).filter(f => f.endsWith(".mjs")).map(f => `module/${f}`)];
test("todos los módulos del sistema tienen sintaxis válida", () => {
  assert(modulos.length > 20);
  for (const m of modulos) assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", raiz + m], { stdio: "pipe" }), m);
});

// Un nombre importado que el otro módulo no exporta también tumba la carga (error de enlace, no de sintaxis).
test("cada nombre importado existe en el módulo del que se importa", () => {
  const exporta = f => { const s = fs.readFileSync(f, "utf8"); return new Set([...s.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([\w$]+)/g)].map(m => m[1]).concat([...s.matchAll(/export\s*\{([^}]*)\}/g)].flatMap(m => m[1].split(",").map(x => x.trim().split(/\s+as\s+/).pop())))); };
  for (const m of modulos) {
    const s = fs.readFileSync(raiz + m, "utf8");
    for (const [, nombres, de] of s.matchAll(/import\s*\{([^}]*)\}\s*from\s*"(\.[^"]+)"/g)) {
      const destino = fileURLToPath(new URL(de, new URL(m, new URL("..", import.meta.url))));
      const hay = exporta(destino);
      for (const n of nombres.split(",").map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) assert(hay.has(n), `${m}: «${n}» no se exporta en ${de}`);
    }
  }
});
