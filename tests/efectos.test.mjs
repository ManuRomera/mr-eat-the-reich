import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { EFECTOS } from '../module/efectos-datos.mjs';
test('el catálogo incluye el equipo, aleteos y compuertas; cada efecto contiene audio íntegro con procedencia',async()=>{
 const meta=JSON.parse(await fs.readFile(new URL('../assets/audio/EFECTOS-FUENTES.json',import.meta.url),'utf8'));
 assert.equal(meta.effects.length,29);assert.deepEqual(meta.effects.map(s=>s.id).sort(),Object.keys(EFECTOS).sort());
 const keys=['rifle-caza','lee-enfield','m3','escopeta','revolver','revolver-doble','ametralladora','granada','dinamita','lanzacohetes','murcielago','enjambre','ataud-abrir','ataud-cerrar'];
 for(const k of keys)assert(EFECTOS[k],k);
 const sources=new Set(meta.sources.map(s=>s.key));
 for(const e of meta.effects){
  const b=await fs.readFile(new URL(`../assets/audio/sfx/${e.id}.ogg`,import.meta.url));
  assert.equal(b.subarray(0,4).toString(),'OggS',e.id);assert(b.includes(Buffer.from('OpusHead')),e.id);
  assert.equal(createHash('sha256').update(b).digest('hex'),e.sha256,e.id);
  assert(e.duration>.1&&e.duration<12,e.id);for(const k of e.sources)assert(sources.has(k),`${e.id}: ${k}`);
 }
});

import {bloquearMusica} from "../module/presentacion-core.mjs";
test("la prioridad de presentación bloquea música ajena y conserva efectos nativos y de interfaz",()=>{
const scene={flags:{"mr-eat-the-reich":{presentacion:true}}};
assert.equal(bloquearMusica(scene,{flags:{}},{playing:true}),true);
assert.equal(bloquearMusica(scene,{flags:{"mr-eat-the-reich":{clave:"sfx"}}},{playing:true}),false);
assert.equal(bloquearMusica(scene,{channel:"interface"},{playing:true}),false);
});
