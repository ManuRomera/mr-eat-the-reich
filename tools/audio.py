#!/usr/bin/env python3
"""Banda sonora (música clásica, grabaciones de dominio público o CC0 de Wikimedia Commons) y efectos sintetizados.
  python3 tools/audio.py musica "<carpeta de trabajo>"   # descarga (una vez), recorta, normaliza y hornea el bucle → assets/audio/musica/*.ogg
  python3 tools/audio.py sfx                             # sintetiza los efectos → assets/audio/sfx/*.ogg
Cada pista: Ogg Opus, −26 LUFS, bucle sin costura (los 4 últimos segundos se funden sobre los 4 primeros). Créditos en assets/audio/CREDITOS.md."""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
import numpy as np

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SAL = os.path.join(RAIZ, "assets", "audio")
UA = {"User-Agent": "ClassicalSearch/1.0 (local script)"}
LICENCIAS = ("public domain", "cc0", "pd")

# id: (título, obra y autor, búsqueda en Commons, comienzo exacto del nombre de archivo, segundo inicial, duración)
PISTAS = {
 "accion":      ("Acción",            "Capricho n.º 24 · N. Paganini",                          "Paganini Caprice 24", "Paganini Caprice-24", 0, 200),
 "vampiros":    ("Los vampiros",      "Danse macabre · C. Saint-Saëns",                          "Saint-Saëns Danse macabre Fourestier", "Saint-Saëns - Danse macabre (Fourestier", 20, 220),
 "sigilo":      ("Sigilo",            "En la gruta del rey de la montaña · E. Grieg",            "Musopen In the Hall Of The Mountain King", "Musopen - In the Hall", 0, 150),
 "miedo":       ("Miedo",             "Una noche en el monte Pelado · M. Músorgski",             "Mussorgsky night on bald mountain", "Modest Mussorgsky - night", 0, 220),
 "opera":       ("La Ópera",          "Cabalgata de las valquirias · R. Wagner",                 "Wagner Ride of the Valkyries", "Richard Wagner - Ride of the Valkyries.ogg", 0, 200),
 "fiesta":      ("Fiesta",            "Galop infernal (cancán) · J. Offenbach",                  "Offenbach Galop Infernal Orpheus Can Can", "Jacques Offenbach - Galop Infernal", 0, 150),
 "funeral":     ("Funeral",           "Marcha fúnebre (Sonata n.º 2) · F. Chopin",               "Chopin Pitman sonata 2 funeral march III", "Chopin Pitman sonata no 2 in b flat minor funeral march III", 0, 220),
 "misterio":    ("Misterio",          "Gnossienne n.º 1 · E. Satie",                             "Satie Gnossienne 1", "Satie - Gnossienne 1", 0, 200),
 "calma":       ("Calma",             "Gymnopédie n.º 1 · E. Satie",                             "Satie gymnopedies lent et douloureux", "Erik Satie - gymnopedies", 0, 190),
 "guerra":      ("Guerra",            "Marte, el portador de la guerra · G. Holst",              "Holst mars United States Air Force Band", "Holst- mars", 0, 220),
 "climax":      ("Clímax",            "Obertura 1812 (final) · P. I. Chaikovski",                "Tchaikovsky 1812 Overture", "1812 Overture.ogg", -230, 220),
 "sorpresa":    ("Sorpresa",          "Sinfonía n.º 5, I · L. van Beethoven",                    "Beethoven Symphonie 5 c-moll Allegro con brio", "Ludwig van Beethoven - Symphonie 5 c-moll", 0, 200),
 "zepelin":     ("El zepelín",        "El Danubio azul · J. Strauss II",                         "Strauss An der schönen blauen Donau European Archive", "Strauss, An der schönen blauen Donau", 60, 200),
 "catedral":    ("La catedral",       "Réquiem: Dies iræ · W. A. Mozart",                        "Mozart Requiem Krips Dies irae", "Mozart - Requiem (Krips) - III", 0, 150),
 "muerte":      ("Último gesto",      "Réquiem: Lacrimosa · W. A. Mozart",                       "Mozart Requiem Krips Lacrimosa", "Mozart - Requiem (Krips) - VIII", 0, 200),
 "persecucion": ("Persecución",       "Guillermo Tell (final) · G. Rossini",                     "Rossini William Tell Overture military band", "Gioachino Rossini, William Tell Overture", -210, 205),
 "cripta":      ("La cripta",         "«Pequeña» fuga en sol menor · J. S. Bach",                "Bach Little Fugue G Minor BWV 578", "J.S.Bach – BWV 578", 0, 220),
 "noche":       ("París de noche",    "Claro de luna · C. Debussy",                              "Clair de lune Claude Debussy Suite bergamasque", "Clair de lune (Claude Debussy)", 0, 220),
}

def api(**p):
    u = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "format": "json", **p})
    for intento in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40))
        except Exception as e:
            print("   reintento:", e); time.sleep(15 * (intento + 1))
    raise SystemExit("Commons no responde")

def localizar(busqueda, prefijo):
    r = api(generator="search", gsrsearch=busqueda + " filetype:audio", gsrnamespace=6, gsrlimit=12, prop="imageinfo", iiprop="url|size|extmetadata", iiextmetadatafilter="LicenseShortName|Artist")
    for p in sorted(r.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0)):
        if p["title"][5:].startswith(prefijo):
            i = p["imageinfo"][0]; m = i.get("extmetadata", {})
            return {"archivo": p["title"][5:], "url": i["url"], "pagina": i["descriptionurl"], "licencia": m.get("LicenseShortName", {}).get("value", "?"),
                    "autor": re.sub(r"\s+", " ", re.sub("<[^>]+>", "", m.get("Artist", {}).get("value", ""))).strip()[:140]}
    return None

def dur(f): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout or 0)

def musica(trabajo):
    orig = os.path.join(trabajo, "orig"); os.makedirs(orig, exist_ok=True); os.makedirs(os.path.join(SAL, "musica"), exist_ok=True)
    indice = os.path.join(trabajo, "fuentes.json"); fuentes = json.load(open(indice)) if os.path.exists(indice) else {}
    for k, (titulo, obra, busqueda, prefijo, ini, largo) in PISTAS.items():
        if k not in fuentes:
            time.sleep(6); f = localizar(busqueda, prefijo)
            if not f: print("NO ENCONTRADA", k); continue
            if not any(l in f["licencia"].lower() for l in LICENCIAS): print("LICENCIA NO LIBRE", k, f["licencia"]); continue
            fuentes[k] = f; json.dump(fuentes, open(indice, "w"), ensure_ascii=False, indent=1)
        f = fuentes[k]; crudo = os.path.join(orig, k + os.path.splitext(f["archivo"])[1])
        if not os.path.exists(crudo):
            print("bajando", f["archivo"], flush=True)
            for intento in range(6):   # Commons limita las descargas seguidas: pausas largas y con calma
                time.sleep(45 + 60 * intento)
                try:
                    with urllib.request.urlopen(urllib.request.Request(f["url"], headers=UA), timeout=240) as r: datos = r.read()
                    open(crudo, "wb").write(datos); break
                except Exception as e: print("   espera:", e, flush=True)
            else: print("SIN BAJAR", k, flush=True); continue
        total = dur(crudo); ini_ = max(0, total + ini) if ini < 0 else ini; L = min(largo, total - ini_ - 0.5); X = 4
        salida = os.path.join(SAL, "musica", k + ".ogg")
        # bucle circular: [cola fundiéndose + cabeza entrando] + cuerpo
        fc = (f"[0:a]atrim={ini_}:{ini_ + L},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-26:TP=-2:LRA=14,asplit=3[a][b][c];"
              f"[a]atrim=0:{X},afade=t=in:d={X}:curve=qsin[cab];[c]atrim={L - X}:{L},asetpts=PTS-STARTPTS,afade=t=out:d={X}:curve=qsin[cola];"
              f"[cab][cola]amix=inputs=2:normalize=0[mez];[b]atrim={X}:{L - X},asetpts=PTS-STARTPTS[med];[mez][med]concat=n=2:v=0:a=1[out]")
        r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", crudo, "-filter_complex", fc, "-map", "[out]", "-c:a", "libopus", "-b:a", "96k", salida], capture_output=True, text=True)
        print("%-12s %5.0fs → %5.1fs  %4.1f MB  %s %s" % (k, total, dur(salida), os.path.getsize(salida) / 1e6 if os.path.exists(salida) else 0, f["licencia"], r.stderr[-200:]))
    with open(os.path.join(SAL, "CREDITOS.md"), "w") as o:
        o.write("# Banda sonora y efectos\n\nMúsica: obras en dominio público; grabaciones de dominio público o CC0 tomadas de Wikimedia Commons, recortadas, normalizadas (−26 LUFS) y con el bucle horneado.\n\n| Pista | Obra | Grabación (según Commons) | Licencia | Fuente |\n|---|---|---|---|---|\n")
        for k, v in PISTAS.items():
            if k in fuentes: f = fuentes[k]; o.write(f"| {v[0]} (`{k}.ogg`) | {v[1]} | {f['autor'] or '—'} | {f['licencia']} | [{f['archivo']}]({f['pagina']}) |\n")
        o.write("\nEfectos (`sfx/`): sintetizados para este sistema con `tools/audio.py sfx` (numpy). Sin muestras de terceros.\n")

# ───────── Efectos sintetizados ─────────
SR = 48000
def t(d): return np.linspace(0, d, int(SR * d), endpoint=False)
def env(x, a=0.005, r=None):
    n = len(x); e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    nr = int((r or 0.05) * SR); e[-nr:] *= np.linspace(1, 0, nr); return x * e
def ruido(d, seed): return np.random.default_rng(seed).uniform(-1, 1, int(SR * d))
def paso_bajo(x, k):   # media móvil: quita agudos
    return np.convolve(x, np.ones(k) / k, mode="same")
def caida(d, tau): return np.exp(-t(d) / tau)

def fx_sello():       # el resultado estampado: golpe seco de tampón sobre madera
    d = 0.35; x = np.sin(2 * np.pi * 95 * t(d)) * caida(d, 0.05) + paso_bajo(ruido(d, 1), 12) * caida(d, 0.02) * 0.9 + np.sin(2 * np.pi * 180 * t(d)) * caida(d, 0.03) * 0.5
    return env(x, 0.001)
def fx_critico():     # campanada metálica sucia
    d = 1.4; x = sum(np.sin(2 * np.pi * f * t(d)) * caida(d, tau) * a for f, tau, a in [(523, .5, 1), (1318, .35, .6), (1975, .25, .4), (2637, .18, .3), (311, .6, .5)])
    return env(x + paso_bajo(ruido(d, 2), 3) * caida(d, 0.01) * 0.6, 0.001, 0.2)
def fx_lesion():      # crujido y golpe sordo
    d = 0.6; cr = paso_bajo(ruido(d, 3), 6) * caida(d, 0.05) * (np.sin(2 * np.pi * 38 * t(d)) > 0.2)
    return env(cr * 0.9 + np.sin(2 * np.pi * (70 - 30 * t(d) / d) * t(d)) * caida(d, 0.12), 0.001, 0.1)
def fx_derribo():     # explosión grave con escombros
    d = 2.2; x = np.sin(2 * np.pi * (60 - 25 * t(d) / d) * t(d)) * caida(d, 0.5) + paso_bajo(ruido(d, 4), 40) * caida(d, 0.6) * 1.4 + paso_bajo(ruido(d, 5), 5) * caida(d, 0.15) * 0.5
    return env(np.tanh(x * 1.8), 0.002, 0.4)
def fx_sangre():      # sorbo húmedo
    d = 0.9; tt = t(d); x = paso_bajo(ruido(d, 6), 18) * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * tt)) * np.sin(np.pi * tt / d) ** 2
    return env(x * 1.6 + np.sin(2 * np.pi * (220 - 120 * tt / d) * tt) * 0.25 * np.sin(np.pi * tt / d), 0.02, 0.15)
def fx_sirena():      # sirena antiaérea: llegan refuerzos
    d = 4.0; tt = t(d); f = 320 + 260 * np.sin(np.pi * tt / d) ** 0.7; fase = 2 * np.pi * np.cumsum(f) / SR
    return env((np.sin(fase) + 0.4 * np.sin(2 * fase) + 0.2 * np.sin(3 * fase)) * 0.6, 0.4, 0.8)
def fx_ataud():       # silbido de caída e impacto
    d1, d2 = 1.5, 1.6; tt = t(d1); f = 1800 - 1400 * (tt / d1) ** 2; silb = np.sin(2 * np.pi * np.cumsum(f) / SR) * (tt / d1) ** 2 * 0.5
    return np.concatenate([silb, fx_derribo()[: int(SR * d2)]])
def fx_objetivo():    # redoble corto y platillo: objetivo cumplido
    d = 1.3; x = np.zeros(int(SR * d))
    for i, tp in enumerate([0, .09, .18, .27, .36, .5]):
        g = paso_bajo(ruido(0.12, 10 + i), 4) * caida(0.12, 0.025); a = int(tp * SR); x[a:a + len(g)] += g * (0.5 + i * 0.1)
    a = int(.5 * SR); pl = ruido(d - .5, 20) * caida(d - .5, 0.3) * 0.5; x[a:a + len(pl)] += pl - paso_bajo(pl, 8)
    return env(x, 0.001, 0.2)
def fx_flashback():   # arpa invertida
    d = 1.6; tt = t(d); x = sum(np.sin(2 * np.pi * f * tt) * np.clip((tt - i * 0.12) / 0.6, 0, 1) ** 2 * 0.3 for i, f in enumerate([392, 494, 587, 740, 880, 1175]))
    return env(x, 0.05, 0.25)

SFX = {"sello": fx_sello, "critico": fx_critico, "lesion": fx_lesion, "derribo": fx_derribo, "sangre": fx_sangre, "sirena": fx_sirena, "ataud": fx_ataud, "objetivo": fx_objetivo, "flashback": fx_flashback}

def sfx():
    os.makedirs(os.path.join(SAL, "sfx"), exist_ok=True)
    for k, f in SFX.items():
        x = f(); x = x / max(1e-9, np.abs(x).max()) * 0.8
        p = subprocess.Popen(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libopus", "-b:a", "64k", os.path.join(SAL, "sfx", k + ".ogg")], stdin=subprocess.PIPE)
        p.communicate(x.astype("<f4").tobytes()); print("sfx", k, "%.1fs" % (len(x) / SR))

if __name__ == "__main__":
    if sys.argv[1] == "sfx": sfx()
    else: musica(sys.argv[2])
