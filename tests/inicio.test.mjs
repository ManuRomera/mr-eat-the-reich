import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
test('la primera importación termina en la sala de despliegue, después de preparar el contenido',async()=>{
 const steps=[];globalThis.fixture={ID:'mr-eat-the-reich',DialogV2:{},actualizarContenido:async()=>steps.push('actualizar'),iniciarPresentacion:async()=>steps.push('sala'),abrirPresentacion:()=>steps.push('panel')};
 globalThis.game={user:{isGM:true},packs:{get:()=>({index:{size:1},getDocuments:async()=>[{import:async()=>steps.push('importar')}]})},settings:{set:async()=>steps.push('importada')}};
 globalThis.ui={notifications:{info(){}}};
 const code=(await fs.readFile(new URL('../module/inicio.mjs',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const mod=await import('data:text/javascript;base64,'+Buffer.from('const {ID,DialogV2,actualizarContenido,iniciarPresentacion,abrirPresentacion}=globalThis.fixture;'+code).toString('base64'));
 await mod.importarAventura();assert.deepEqual(steps,['importar','actualizar','importada','sala','panel']);
});
