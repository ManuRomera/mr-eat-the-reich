import assert from 'node:assert/strict';
import {crearVistaPresentacion} from '../module/presentacion-vista.mjs';
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.classes=new Set();this.style={setProperty:(k,v)=>this.attrs[k]=v};this.classList={add:(...cs)=>cs.forEach(c=>this.classes.add(c)),remove:(...cs)=>cs.forEach(c=>this.classes.delete(c)),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
 set className(v){this.name=v;this.classes=new Set(v.split(' '));} get className(){return [...this.classes].join(' ');}
 append(...nodes){this.children.push(...nodes);} setAttribute(k,v){this.attrs[k]=v;} remove(){this.removed=true;}
 find(cls){if(this.classes.has(cls))return this;for(const c of this.children){const found=c.find(cls);if(found)return found;}}
}
const doc={createElement:t=>new Element(t),body:new Element('body')};const v=crearVistaPresentacion(doc,'systems/mr-eat-the-reich');
const roster=[{id:'iryna',jugador:'Ana <&>'},{id:'flint',jugador:'Carlos'}];
v.render({personaje:'iryna'},roster,true);assert(v.root.classes.has('is-character'));assert.equal(v.root.find('er-pres-jugador').textContent,'Ana <&>');assert.equal(v.root.find('er-pres-original').src,'systems/mr-eat-the-reich/assets/libro/iryna.webp');
v.render({personaje:'flint'},roster,true);v.render({personaje:''},roster,true);await new Promise(r=>setTimeout(r,290));assert(!v.root.classes.has('is-character'),'Siguiente cancela cualquier apertura pendiente');
v.render({personaje:'flint'},roster,true);assert.equal(v.root.find('er-pres-nombre').textContent,'Flint');
v.render({personaje:'flint'},roster,false);assert(!v.root.classes.has('is-visible'));assert(!doc.body.classes.has('er-presentacion-exclusiva'));
v.render({personaje:'iryna'},roster,true);assert(v.root.classes.has('is-character'),'Una conexión tardía recupera el personaje compartido');
v.destroy();assert(v.root.removed);assert(!doc.body.classes.has('er-presentacion-exclusiva'));
console.log('OK: ilustración original, nombres seguros, cambio rápido cancelado por Siguiente, conexión tardía y limpieza al salir.');
