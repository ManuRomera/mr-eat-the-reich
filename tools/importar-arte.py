#!/usr/bin/env python3
"""Arte propio (generado con Codex) → assets del sistema, firmado con la marca MR.
  python3 tools/importar-arte.py "<Trabajo ETR/art/new>"
esc-<clave>.png → assets/escenas/<clave>.webp (1920×1080, marca en la esquina) + <clave>-thumb.webp
am-<clave>.png  → assets/amenazas/<clave>.webp (retrato) + <clave>-token.webp (400 px, marca discreta)
Además copia el brillo animado de la marca y deja su caja en content/marca.json para scripts/gen-aventura.mjs."""
import json, os, shutil, sys
from pathlib import Path
from PIL import Image
MARCA = Path("/Volumes/Datos_Dock/FoundryVTT/Trabajo LOGO/marca"); sys.path.insert(0, str(MARCA))
import marca  # noqa: E402  (regla de la casa: toda imagen propia lleva la marca MR)

SRC = Path(sys.argv[1]); RAIZ = Path(__file__).resolve().parent.parent; A = RAIZ / "assets"
for d in ("escenas", "amenazas", "marca"): (A / d).mkdir(parents=True, exist_ok=True)

def cubrir(im, w, h):
    s = max(w / im.width, h / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2; return im.crop((x, y, x + w, y + h))

n = 0
for f in sorted(SRC.glob("esc-*.png")):
    k = f.stem[4:]; im = cubrir(Image.open(f).convert("RGB"), 1920, 1080)
    mini = im.copy(); mini.thumbnail((400, 400)); mini.save(A / "escenas" / f"{k}-thumb.webp", "WEBP", quality=80)
    marca.esquina(im).save(A / "escenas" / f"{k}.webp", "WEBP", quality=84, method=6); n += 1
for f in sorted(SRC.glob("am-*.png")):
    k = f.stem[3:]; im = cubrir(Image.open(f).convert("RGB"), 768, 768)
    ficha = marca.discreta(im.resize((400, 400), Image.LANCZOS).convert("RGBA"), 280, 316, 30).convert("RGB")
    ficha.save(A / "amenazas" / f"{k}-token.webp", "WEBP", quality=86)
    marca.esquina(im).save(A / "amenazas" / f"{k}.webp", "WEBP", quality=86, method=6); n += 1
shutil.copy(MARCA / "mr-marca.webm", A / "marca" / "mr-marca.webm")
x, y, w, h = marca.caja_animada(1920, 1080)
(RAIZ / "content").mkdir(exist_ok=True)
json.dump({"x": x, "y": y, "w": w, "h": h}, open(RAIZ / "content" / "marca.json", "w"))
print(n, "imágenes; marca animada en", (x, y, w, h))
