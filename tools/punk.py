#!/usr/bin/env python3
"""Genera styles/punk.css: las marcas «a rotulador» del sistema (casillas torcidas, X que se salen, vistos, gotas de sangre, tachones).
Cada marca es un SVG incrustado; se dibuja más grande que su casilla para que se salga del hueco.  python3 tools/punk.py"""
import os
from urllib.parse import quote

ROJO, SECA, TINTA, CREMA = "#c40f2c", "#8b0018", "#17152a", "#f1ead6"

def svg(cuerpo, vb="0 0 48 48"):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" preserveAspectRatio="none">{cuerpo}</svg>'
    return 'url("data:image/svg+xml,' + quote(s, safe="/:=' ") + '")'
def trazo(d, c, w, op=1):
    return f"<path d='{d}' fill='none' stroke='{c}' stroke-width='{w}' stroke-linecap='round' stroke-linejoin='round' opacity='{op}'/>"

def caja(c, relleno="none"):
    return svg(f"<path d='M7 9 L40 6 L42 41 L8 43 Z' fill='{relleno}' stroke='{c}' stroke-width='3.4' stroke-linejoin='round'/>" + trazo("M5 12 L9 44", c, 1.6, .7) + trazo("M9 5 L43 4", c, 1.2, .6))
X = [
    lambda c: trazo("M3 5 C14 15 30 31 45 44", c, 5.5) + trazo("M44 3 C33 15 17 30 4 45", c, 5.5) + trazo("M7 3 C18 16 31 29 46 40", c, 2, .65),
    lambda c: trazo("M2 9 C16 18 28 30 46 40", c, 5) + trazo("M6 5 C20 20 30 29 43 46", c, 2.4, .7) + trazo("M46 6 C30 16 18 30 2 43", c, 6),
    lambda c: trazo("M8 2 C16 16 30 32 42 46", c, 6) + trazo("M46 10 C30 18 16 28 2 38", c, 5) + trazo("M25 30 C25 37 24 42 25 47", c, 2.2, .8),
]
visto = lambda c: trazo("M4 26 C10 30 14 37 18 45 C24 27 34 12 46 2", c, 6.5) + trazo("M7 24 C12 29 16 35 19 41", c, 2.2, .6)
gota = lambda c: (f"<path d='M24 2 C30 14 41 22 40 32 C39 41 32 46 24 46 C16 46 8 41 8 32 C7 22 18 14 24 2 Z' fill='{c}'/>"
                  f"<circle cx='42' cy='12' r='2.6' fill='{c}'/><circle cx='5' cy='20' r='1.8' fill='{c}'/><path d='M30 44 C30 46 31 47 30 48' stroke='{c}' stroke-width='3' stroke-linecap='round'/>"
                  "<path d='M16 30 C15 25 18 20 21 17' fill='none' stroke='#fff' stroke-width='2.4' stroke-linecap='round' opacity='.45'/>")
aro = lambda c: trazo("M24 5 C30 15 39 23 38 32 C37 40 31 44 24 44 C17 44 10 40 10 32 C9 23 18 15 24 5 Z", c, 2.6) + trazo("M22 7 C17 14 12 22 12 30", c, 1.2, .6)
tacha = lambda c: svg(trazo("M2 9 C20 2 30 15 50 7 S80 11 98 5", c, 3.4) + trazo("M4 5 C30 12 60 3 96 10", c, 1.6, .7), "0 0 100 14")

def juego(c_caja, c_marca, gris="rgba(23,21,42,.22)"):
    v = {"caja": caja(c_caja), "caja-gris": caja(c_caja, gris), "ok": svg(visto(c_marca)), "gota": svg(gota(c_marca)), "aro": svg(aro(c_caja)), "tacha": tacha(c_marca)}
    v.update({f"x{i + 1}": svg(f(c_marca)) for i, f in enumerate(X)})
    return "".join(f"  --pk-{k}: {u};\n" for k, u in v.items())

CSS = f"""/* GENERADO por tools/punk.py — no editar a mano. Marcas punk: casillas torcidas y X a rotulador que se salen del hueco. */
:root {{
{juego(TINTA, ROJO)}}}
/* Dentro del ataúd (forro de color) la sangre es seca, más oscura, para que se lea sobre rosa o naranja. */
.er-forro {{
{juego(TINTA, SECA)}}}
body.er-oscuro {{
{juego(CREMA, "#ff2d55", "rgba(241,234,214,.25)")}}}
body.er-oscuro .er-forro {{
{juego(TINTA, SECA)}}}

/* Casillas de verificación: fuera la cajita perfecta de Foundry */
.mr-eat-the-reich input[type="checkbox"] {{ appearance: none; -webkit-appearance: none; width: 28px; height: 28px; margin: -4px 0; padding: 0; border: 0; border-radius: 0; flex: none; cursor: pointer;
  background: var(--pk-caja) center / 62% 62% no-repeat; box-shadow: none; transform: rotate(-3deg); }}
.mr-eat-the-reich input[type="checkbox"]::before, .mr-eat-the-reich input[type="checkbox"]::after {{ content: none !important; display: none !important; }}
.mr-eat-the-reich input[type="checkbox"]:checked {{ background: var(--pk-x1) center / 100% 100% no-repeat, var(--pk-caja) center / 62% 62% no-repeat; }}
.mr-eat-the-reich input[type="checkbox"]:disabled {{ opacity: .45; cursor: default; }}
.mr-eat-the-reich input[type="checkbox"]:focus-visible {{ outline: 3px solid var(--er-neon); outline-offset: 0; }}
/* Mejoras desbloqueadas: un visto grande en vez de la X */
.mr-eat-the-reich :is(.er-poder, .er-pod) input[type="checkbox"]:checked {{ background: var(--pk-ok) center / 110% 110% no-repeat, var(--pk-caja) center / 62% 62% no-repeat; }}

/* Usos del equipo: libre = casilla; gastado = X encima; la gris es el último uso */
.mr-eat-the-reich .er-uso {{ width: 30px; height: 30px; margin: -3px -2px; border: 0; background: var(--pk-caja) center / 60% 60% no-repeat; }}
.mr-eat-the-reich .er-uso.ultima {{ background-image: var(--pk-caja-gris); }}
.mr-eat-the-reich .er-uso:not(.llena) {{ background: var(--pk-x1) center / 100% 100% no-repeat, var(--pk-caja) center / 60% 60% no-repeat; }}
.mr-eat-the-reich .er-uso.ultima:not(.llena) {{ background: var(--pk-x2) center / 100% 100% no-repeat, var(--pk-caja-gris) center / 60% 60% no-repeat; }}
.mr-eat-the-reich .er-uso:nth-child(2n):not(.llena) {{ background-image: var(--pk-x2), var(--pk-caja); }}
.mr-eat-the-reich .er-uso:nth-child(3n):not(.llena) {{ background-image: var(--pk-x3), var(--pk-caja); }}
.mr-eat-the-reich .er-uso:nth-child(2n) {{ transform: rotate(5deg); }}
.mr-eat-the-reich .er-uso:nth-child(2n+1) {{ transform: rotate(-4deg); }}
.mr-eat-the-reich .er-uso::after {{ content: none !important; }}

/* Lesiones: X grande y el nombre tachado a rotulador */
.mr-eat-the-reich .er-marca {{ width: 34px; height: 34px; margin: -4px 0; border: 0; background: var(--pk-caja) center / 58% 58% no-repeat; transform: rotate(3deg); }}
.mr-eat-the-reich .er-lesion.marcada .er-marca {{ background: var(--pk-x3) center / 100% 100% no-repeat, var(--pk-caja) center / 58% 58% no-repeat; border: 0; box-shadow: none; }}
.mr-eat-the-reich .er-lesion:nth-child(2n).marcada .er-marca {{ background-image: var(--pk-x2), var(--pk-caja); transform: rotate(-6deg); }}
.mr-eat-the-reich .er-lesion.marcada b {{ background: var(--pk-tacha) center / 100% 70% no-repeat; padding: 0 4px; }}

/* Sangre: gotas. Vacía = contorno; llena = salpicón */
.mr-eat-the-reich .er-gota {{ width: 34px; height: 38px; border: 0; background: var(--pk-aro) center / 82% 82% no-repeat; font-size: .8em; padding-top: 9px; }}
.mr-eat-the-reich .er-gota.llena {{ background: var(--pk-gota) center / 100% 100% no-repeat; border: 0; color: #fff; }}
.mr-eat-the-reich .er-gota:nth-child(2n) {{ transform: rotate(7deg); }}
.mr-eat-the-reich .er-gota:nth-child(3n) {{ transform: rotate(-8deg) translateY(2px); }}

/* Turnos del Panel de misión: quien ya actuó queda tachado */
.mr-eat-the-reich .er-turno.actuo::after {{ content: ""; position: absolute; inset: -6px; background: var(--pk-x2) center / 100% 100% no-repeat; pointer-events: none; }}
.mr-eat-the-reich .er-fila.hecho :is(.er-fila-nombre, input[type="text"]) {{ text-decoration: none; background-image: var(--pk-tacha); background-position: center; background-size: 100% 60%; background-repeat: no-repeat; }}

body.er-sin-movimiento .mr-eat-the-reich :is(.er-uso, .er-gota, .er-marca, input[type="checkbox"]) {{ transform: none; }}
"""
destino = os.path.join(os.path.dirname(__file__), "..", "styles", "punk.css")
open(destino, "w").write(CSS)
print("punk.css", len(CSS) // 1024, "KB")
