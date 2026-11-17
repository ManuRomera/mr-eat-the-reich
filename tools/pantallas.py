#!/usr/bin/env python3
"""Verifica cómo se ven las ventanas del sistema en pantallas de distinto tamaño, emulándolas con Chrome (sin Foundry).
  python3 tools/pantallas.py                       # tabla con todas las ventanas en las pantallas habituales; sale con 1 si alguna falla
  python3 tools/pantallas.py --capturas salida/    # además, una captura por ventana y pantalla y una hoja de contactos por pantalla
  python3 tools/pantallas.py --pantallas 1440x780  # solo esas pantallas (separadas por comas)
Sirve tests/arnes.html (modo ?verificar), que aplica module/ventanas.mjs con un emulador del posicionamiento de Foundry
y deja el informe en <pre id="informe-pantallas">. Una ventana falla si se sale de la pantalla, deja su botón principal fuera
o ocupa más del 92 % del alto o del ancho en pantallas menores de 1080p."""
import argparse, functools, html, http.server, json, os, re, subprocess, sys, tempfile, threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PUBLIC = "/Applications/Foundry Virtual Tabletop.app/Contents/Resources/app/public"
# Pantallas (área del navegador, en píxeles CSS) de portátiles y monitores habituales.
PANTALLAS = {"1024x640": "tableta pequeña", "1280x650": "portátil 13\" antiguo", "1366x657": "portátil 15\" básico", "1440x780": "MacBook 15\" (escalado por defecto)",
             "1512x860": "MacBook 14\"", "1536x730": "portátil Windows 15\" al 125 %", "1680x900": "monitor 1680", "1920x950": "monitor 1080p", "2560x1300": "monitor 1440p"}
VENTANAS = ["ataud", "clasica", "amenaza", "mision", "tirada", "seguridad", "presentacion"]

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass

def servir(directorio, puerto):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", puerto), functools.partial(H, directory=str(directorio)))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv

def chrome(args, tam):
    return subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={tam}", "--virtual-time-budget=6000", *args],
                          capture_output=True, text=True, timeout=120)

AJUSTE = [0, 0]   # lo que Chrome headless resta de la ventana (su barra): se mide una vez para pedir la vista exacta

def ventana(tam):
    ancho, alto = (int(v) for v in tam.split(","))
    return f"{ancho + AJUSTE[0]},{alto + AJUSTE[1]}"

def calibrar(url):
    r = informe(url, "1000,700", calibrando=True)[0]
    ancho, alto = (int(v) for v in r["pantalla"].split("×"))
    AJUSTE[0], AJUSTE[1] = 1000 - ancho, 700 - alto

def informe(url, tam, calibrando=False):
    out = chrome(["--dump-dom", url + "?verificar"], tam if calibrando else ventana(tam)).stdout
    m = re.search(r'<pre id="informe-pantallas"[^>]*>(.*?)</pre>', out, re.S)
    if not m: return [{"nombre": "?", "pantalla": tam, "ok": False, "error": "el arnés no dejó informe"}]
    return json.loads(html.unescape(m.group(1)))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--pantallas"); ap.add_argument("--capturas"); a = ap.parse_args()
    sistema = json.load(open(RAIZ / "system.json"))["id"]
    raiz = Path(tempfile.mkdtemp()); (raiz / "systems").mkdir(); (raiz / "systems" / sistema).symlink_to(RAIZ)
    servir(raiz, 30021); servir(PUBLIC, 30022)
    url = f"http://localhost:30021/systems/{sistema}/tests/arnes.html"
    pantallas = a.pantallas.split(",") if a.pantallas else list(PANTALLAS)
    calibrar(url)
    with ThreadPoolExecutor(4) as ex: informes = dict(zip(pantallas, ex.map(lambda p: informe(url, p.replace("x", ",")), pantallas)))
    fallos = 0
    for p in pantallas:
        print(f"\n{p}  {PANTALLAS.get(p, '')}")
        print(f"  {'ventana':13} {'escala':>6} {'alto':>6} {'ancho':>6}  caja (x, y, ancho × alto)")
        for e in informes[p]:
            if "error" in e: print(f"  {e['nombre']:13} ✗ {e['error']}"); fallos += 1; continue
            marca = "✓" if e["ok"] else "✗"; fallos += not e["ok"]
            if e["pantalla"] != p.replace("x", "×"): print(f"  (aviso: la vista real es {e['pantalla']})"); 
            motivos = [t for t, c in (("fuera de pantalla", not e["dentro"]), ("sin botón", e["botonVisible"] is False), ("ocupa demasiado", e["ocupaDemasiado"])) if c]
            print(f"  {e['nombre']:13} {e['escala']:>6.2f} {e['fraccionAlto']:>6.0%} {e['fraccionAncho']:>6.0%}  {e['caja']} {marca} {', '.join(motivos)}")
    if a.capturas:
        out = Path(a.capturas); out.mkdir(parents=True, exist_ok=True)
        trabajos = [(p, v) for p in pantallas for v in VENTANAS]
        def captura(t):
            p, v = t; chrome([f"--screenshot={out / f'{p}-{v}.png'}", f"{url}?verificar={v}"], ventana(p.replace("x", ","))); return t
        with ThreadPoolExecutor(4) as ex: list(ex.map(captura, trabajos))
        try:
            from PIL import Image
            for p in pantallas:
                ims = [Image.open(out / f"{p}-{v}.png").convert("RGB") for v in VENTANAS if (out / f"{p}-{v}.png").exists()]
                if not ims: continue
                w, h = 640, round(640 * ims[0].height / ims[0].width); hoja = Image.new("RGB", (w * 3 + 20, (h + 10) * ((len(ims) + 2) // 3)), (30, 30, 40))
                for i, im in enumerate(ims): hoja.paste(im.resize((w, h)), ((i % 3) * (w + 10), (i // 3) * (h + 10)))
                hoja.save(out / f"hoja-{p}.jpg", quality=84)
        except ImportError: pass
        print(f"\nCapturas en {out}")
    print("\nTodo en orden." if not fallos else f"\n{fallos} ventana(s) con problemas.")
    sys.exit(1 if fallos else 0)

if __name__ == "__main__": main()
