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

import { podarCatalogo } from '../module/direccion-contenido.mjs';
import { EFECTOS, EFECTOS_BARRA, sonidoDe } from '../module/efectos-datos.mjs';
test('la barra lleva pocos efectos y la poda respeta lo que el director reasignó', () => {
 assert(Object.keys(EFECTOS_BARRA).length <= 8);
 for (const id of Object.keys(EFECTOS_BARRA)) assert(EFECTOS[id], id);
 const propio = id => ({ id, sound: { src: `systems/mr-eat-the-reich/assets/audio/sfx/${id}.ogg?v=0.6.0` } });
 const guardado = [propio('sirena'), propio('revolver'), { id: 'escopeta', sound: { src: 'worlds/mio/pum.ogg' } }, { id: 'mio', sound: { uuid: 'Playlist.1' } }, { id: 'lanza', sound: null }];
 const retirados = Object.keys(EFECTOS).filter(id => !(id in EFECTOS_BARRA));
 assert.deepEqual(podarCatalogo(guardado, retirados).map(e => e.id), ['sirena', 'escopeta', 'mio']);
});
test('cada arma de serie tiene su sonido y los nombres raros no suenan', () => {
 const casos = { 'Rifle de caza exquisito (último uso: explota)': 'rifle-caza', 'Rifle Lee-Enfield recortado': 'lee-enfield', 'Subfusil M3': 'm3', 'Granadas de humo': 'humo', 'Granada de fragmentación': 'granada',
  'Lanzacohetes': 'lanzacohetes', 'Lanza': 'lanza', 'Par de revólveres, Betsy y María': 'revolver-doble', 'Garras de acero': 'garra', 'Sirvientes de la noche (1 de Sangre)': 'enjambre', 'Glamur oscuro (1 de Sangre)': '', 'Cinturón de herramientas': '' };
 for (const [nombre, id] of Object.entries(casos)) { assert.equal(sonidoDe(nombre), id, nombre); if (id) assert(EFECTOS[id], id); }
});
