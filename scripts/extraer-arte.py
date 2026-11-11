"""Extrae del PDF del manual (copia propia) las páginas ilustradas a assets/libro/. Uso privado: assets/libro no se versiona.
   python3 scripts/extraer-arte.py "/ruta/al/manual.pdf" """
import sys, io, os, fitz
from PIL import Image
pdf = fitz.open(sys.argv[1]); out = os.path.join(os.path.dirname(__file__), "..", "assets", "libro"); os.makedirs(out, exist_ok=True)
def pagina(n, maxlado=2000):
    xref = pdf[n - 1].get_images()[0][0]
    im = Image.open(io.BytesIO(pdf.extract_image(xref)["image"])).convert("RGB")
    im.thumbnail((maxlado, maxlado)); return im
PAGINAS = {"portada": 1, "paris": 10, "iryna": 15, "nicole": 17, "cosgrave": 19, "chuck": 21, "astrid": 23, "flint": 25, "cofre": 28,
           "stahlsoldat": 53, "rust-witch": 57, "damonenblut": 59, "vampirjager": 60, "werhund": 65, "hitler": 66, "contra": 78}
for nombre, n in PAGINAS.items():
    im = pagina(n); im.save(f"{out}/{nombre}.webp", quality=86); print(nombre, im.size)
# El mapa es una sola imagen a doble página.
xref = pdf[47].get_images()[0][0]
im = Image.open(io.BytesIO(pdf.extract_image(xref)["image"])).convert("RGB"); im.thumbnail((4000, 4000)); im.save(f"{out}/mapa.webp", quality=84); print("mapa", im.size)

# Retratos cuadrados para tokens: mismo encuadre de cara que usa scripts/gen-aventura.mjs.
CARA = {"iryna": (0.47, 0.27, 2.3), "nicole": (0.38, 0.28, 2.3), "cosgrave": (0.45, 0.24, 2.4), "chuck": (0.37, 0.27, 2.3), "astrid": (0.4, 0.24, 2.4), "flint": (0.5, 0.6, 2.2),
        "rust-witch": (0.42, 0.24, 2.4), "damonenblut": (0.43, 0.25, 2.3), "werhund": (0.43, 0.33, 2.2), "vampirjager": (0.5, 0.45, 1.3)}
ret = os.path.join(out, "..", "retratos"); os.makedirs(ret, exist_ok=True)
for nombre, (x, y, z) in CARA.items():
    im = Image.open(f"{out}/{nombre}.webp"); w, h = im.size; lado = w / z
    cx = min(max(x * w, lado / 2), w - lado / 2); cy = min(max(y * h, lado / 2), h - lado / 2)
    im.crop((int(cx - lado / 2), int(cy - lado / 2), int(cx + lado / 2), int(cy + lado / 2))).resize((400, 400)).save(f"{ret}/{nombre}.webp", quality=88)
m = Image.open(f"{out}/mapa.webp"); m.thumbnail((600, 600)); m.save(f"{out}/mapa-thumb.webp", quality=80)
print("retratos", len(CARA))
