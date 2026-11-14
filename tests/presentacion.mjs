/** Ciclo completo y exclusión de audio, sin servidor Foundry. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PERSONAJES,ESTADO_INICIAL,TIEMPOS,estadoSeguro,siguienteEstado,reparto,bloquearMusica} from '../module/presentacion-core.mjs';
import {AUDIO,VERSION_CONTENIDO} from '../module/banda-sonora-datos.mjs';
const ID='mr-eat-the-reich',RUTA='systems/'+ID;
assert(TIEMPOS.apertura>=2500 && TIEMPOS.cierre>=2500);
assert.equal(estadoSeguro(null).activa,false);
assert.equal(estadoSeguro({personaje:'<script>',revision:-1}).personaje,'');
assert.equal(siguienteEstado({revision:4},{personaje:'flint'}).revision,5);
const cast=reparto([{id:'a1',name:'Iryna',type:'vampiro',ownership:{u1:3},flags:{}}],[{id:'u1',name:'Ana <&>',isGM:false},{id:'gm',name:'Director',isGM:true}]);
assert.equal(cast[0].boton,'Ana <&>');
assert.equal(cast[1].boton,'Nicole');
const compartido=reparto([{id:'a1',name:'Iryna',type:'vampiro',ownership:{u1:3,u2:3}}],[{id:'u1',name:'Ana',characterId:'a1'},{id:'u2',name:'Luis'}]);assert.equal(compartido[0].jugador,'Ana','El personaje asignado prima sobre permisos compartidos');
const hooks=new Map();
globalThis.Hooks={on:(k,f)=>{if(!hooks.has(k))hooks.set(k,[]);hooks.get(k).push(f);},once:(k,f)=>{if(!hooks.has(k))hooks.set(k,[]);hooks.get(k).push(f);}};
const emit=(k,...args)=>(hooks.get(k)??[]).map(f=>f(...args));
const collection=()=>{const a=[];Object.defineProperty(a,'contents',{get(){return this;}});a.get=id=>a.find(x=>x.id===id);return a;};
let id=0,writes=0,errors=[],states=[],fxLog=[],leaveOnOpen=false;const settings=new Map();
const scenes=collection(),playlists=collection();
const flag=(d,s,k)=>d.flags?.[s]?.[k];
function doc(d){return {...d,id:d.id??'d'+(++id),getFlag(s,k){return flag(this,s,k);},async update(delta){writes++;for(const[k,v]of Object.entries(delta)){if(k==='background.src')this.background.src=v;else this[k]=v;}Object.assign(this._source??{},delta);return this;}};}
function sound(d,parent){return {...doc(d),parent,async update(delta){const veto=emit('preUpdatePlaylistSound',this,delta).includes(false);if(!veto){writes++;Object.assign(this,delta);}return this;}};}
function playlist(d){const p={...doc(d),sounds:collection(),async createEmbeddedDocuments(type,ds){assert.equal(type,'PlaylistSound');for(const d of ds){const s=sound(d,p);if(!emit('preCreatePlaylistSound',s,d).includes(false))p.sounds.push(s);}return p.sounds;},async updateEmbeddedDocuments(type,ds){for(const d of ds)await p.sounds.get(d._id).update(d);},async playSound(s){return s.update({playing:true});},async stopSound(s){return s.update({playing:false});},async stopAll(){for(const s of p.sounds)if(s.playing)await p.stopSound(s);}};playlists.push(p);return p;}
function scene(d){const s={...doc(d),_source:{...d},async activate(){for(const x of scenes)x.active=false;this.active=true;game.scenes.active=this;emit('updateScene',this,{active:true});return this;}};scenes.push(s);return s;}
globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{isSelf:true},contents:[]},actors:{contents:[]},scenes,playlists,settings:{register(s,k,d){settings.set(s+'.'+k,d.default);this.defs.set(s+'.'+k,d);},defs:new Map(),registerMenu(){},get:(s,k)=>settings.get(s+'.'+k),async set(s,k,v){writes++;settings.set(s+'.'+k,v);if(k==='presentacionEstado'){states.push({...v});if(v.fase==='abriendo'&&leaveOnOpen){leaveOnOpen=false;await original.activate();}}this.defs.get(s+'.'+k)?.onChange?.(v);}},modules:new Map()};
globalThis.document={createElement:()=>({addEventListener(){}})};
globalThis.Playlist={create:async d=>playlist(d)};globalThis.Scene={create:async d=>scene(d)};
globalThis.ui={notifications:{error:x=>errors.push(x),warn(){}}};
const prelude='const {ID,RUTA,AUDIO,VERSION_CONTENIDO,PERSONAJES,ESTADO_INICIAL,TIEMPOS,estadoSeguro,siguienteEstado,reparto,bloquearMusica}=globalThis.fixture; const sonar=k=>globalThis.fixture.fx.push(k); const mision=()=>({banquillo:[]}); const ApplicationV2=class{}; const HandlebarsApplicationMixin=c=>c; const crearVistaPresentacion=()=>({root:{append(){}},render(){}});';
globalThis.fixture={ID,RUTA,AUDIO,VERSION_CONTENIDO,PERSONAJES,ESTADO_INICIAL,TIEMPOS:{entrada:0,apertura:0,cierre:0,fundido:0},estadoSeguro,siguienteEstado,reparto,bloquearMusica,fx:fxLog};
const code=(await fs.readFile(new URL('../module/presentacion.mjs',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const mod=await import('data:text/javascript;base64,'+Buffer.from(prelude+code).toString('base64'));
mod.registrarPresentacion();
const original=scene({id:'original',name:'París',flags:{[ID]:{escena:'paris'}}});game.scenes.active=original;
await Promise.all([mod.asegurarPresentacion(),mod.asegurarPresentacion()]);
assert.equal(scenes.length,2);assert.equal(playlists.length,1);assert.equal(playlists[0].sounds.length,7);
const count=writes;await mod.asegurarPresentacion();assert.equal(writes,count,'Preparación idempotente');
const own=playlists[0];const mr=playlist({name:'MR Dirección',flags:{'mr-direccion':{managed:true}}});
await mr.createEmbeddedDocuments('PlaylistSound',[{name:'Otra música',playing:true,flags:{'mr-direccion':{ch:'music'}}},{name:'Efecto',playing:true,flags:{'mr-direccion':{ch:'fx'}}}]);
const music=mr.sounds[0],fx=mr.sounds[1];
await mod.iniciarPresentacion();assert.equal(mod.estadoPresentacion().anterior,'original');
const playing=()=>own.sounds.filter(s=>s.playing).map(s=>s.flags[ID].presentacionTema);
assert.deepEqual(playing(),['sala']);assert.equal(music.playing,false);assert.equal(fx.playing,true);
await mr.playSound(music);assert.equal(music.playing,false,'MR no pisa la música de la sala');
await fx.update({playing:false});await mr.playSound(fx);assert.equal(fx.playing,true,'Los efectos siguen disponibles');
for(const p of PERSONAJES){await mod.presentarPersonaje('pj-'+p.id);assert.equal(mod.estadoPresentacion().personaje,p.id);assert.deepEqual(playing(),[p.id]);await mod.siguientePresentacion();assert.equal(mod.estadoPresentacion().personaje,'');assert.deepEqual(playing(),['sala']);}
await Promise.all([mod.presentarPersonaje('iryna'),mod.siguientePresentacion(),mod.presentarPersonaje('flint')]);assert.deepEqual(playing(),['flint'],'Pulsaciones rápidas serializadas');
await own.playSound(own.sounds.find(s=>s.flags[ID].presentacionTema==='sala'));
emit('ready');await new Promise(r=>setImmediate(r));assert.deepEqual(playing(),['flint'],'Recarga: la pista nativa de sala se reconcilia con el personaje compartido');
const point=states.length;await mod.siguientePresentacion();assert.deepEqual(states.slice(point).slice(0,3).map(s=>s.fase),['cerrando','salida','sala']);await mod.presentarPersonaje('flint');assert(fxLog.includes('ataud-abrir')&&fxLog.includes('ataud-cerrar'));
game.user.isGM=false;await mod.presentarPersonaje('chuck');await mod.terminarPresentacion();assert.deepEqual(playing(),['flint'],'El jugador no publica cambios');
game.user.isGM=true;await mod.terminarPresentacion();assert.equal(game.scenes.active.id,'original');assert.equal(mod.estadoPresentacion().activa,false);assert.deepEqual(playing(),[]);
await mr.playSound(music);assert.equal(music.playing,true,'Fuera de presentación se libera el audio');
await mod.iniciarPresentacion();leaveOnOpen=true;await mod.presentarPersonaje('iryna');await new Promise(r=>setImmediate(r));assert.equal(game.scenes.active.id,'original');assert.equal(mod.estadoPresentacion().activa,false);assert.deepEqual(playing(),[],'Salir durante la apertura cancela la secuencia y detiene su música');
assert.equal(errors.length,0);assert.equal(scenes.length,2);assert.equal(own.sounds.length,7);
console.log('OK: seis protagonistas, propiedad de jugadores, sala/tema/personaje/Siguiente/salida, cola rápida, permisos, FX y prioridad frente a MR Dirección.');
