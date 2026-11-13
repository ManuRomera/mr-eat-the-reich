import test from 'node:test';
import assert from 'node:assert/strict';
import { repararCatalogo } from '../module/direccion-contenido.mjs';
test('recupera motivos vacíos, IDs ausentes y rutas del sistema; conserva elecciones externas', () => {
 const expected=['accion','pj-iryna','calma'].map(id=>({id,music:{src:`systems/mr-eat-the-reich/assets/audio/${id}.ogg?v=0.6.0`}}));
 const world=[{id:'accion',music:null},{id:'calma',music:{src:'worlds/mio/calmar.mp3'}},{id:'personal',music:{uuid:'Playlist.123'}}];
 const fixed=repararCatalogo(world,expected);
 assert.equal(fixed.length,4);assert(fixed[0].music.src.includes('0.6.0'));
 assert.equal(fixed[1].music.src,'worlds/mio/calmar.mp3');assert.equal(fixed[2].music.uuid,'Playlist.123');
 assert.equal(fixed[3].id,'pj-iryna');assert.deepEqual(repararCatalogo(fixed,expected),fixed);
 const fx=repararCatalogo([{id:'ataud',sound:null}],[{id:'ataud',sound:{src:'systems/mr-eat-the-reich/assets/audio/sfx/ataud.ogg?v=0.6.0'}}],'sound');
 assert(fx[0].sound.src.includes('0.6.0'));
});
