/** Modelos de datos: vampiro (PJ) y amenaza (fuerzas nazis y Übermenschen). Incluye objetos de atrezo colocables como tokens; no hay Items. */
import { ATRIBUTOS } from "./datos.mjs";
import { atributosEfectivos, bloqueos, SANGRE_MAX } from "./reglas.mjs";

const { StringField, HTMLField, NumberField, ArrayField, SchemaField, BooleanField, ObjectField } = foundry.data.fields;
const texto = (initial = "") => new StringField({ required: true, blank: true, initial });
const entero = (initial, min, max) => new NumberField({ required: true, integer: true, min, max, initial });
const si = (initial = false) => new BooleanField({ initial });

const poder = () => new SchemaField({
  nombre: texto(), tipo: new StringField({ required: true, choices: ["especial", "sangre", "pasiva"], initial: "sangre" }),
  texto: texto(), coste: entero(1, 0, 5), bono: entero(0, 0, 5), req: texto(), activa: si(true)
});
const lesion = () => new SchemaField({ nombre: texto(), efecto: texto(), mod: new ObjectField(), bloqueo: texto(), marcada: si() });
const LESIONES_VACIAS = () => [0, 1, 2].map(() => [0, 1].map(() => ({ nombre: "", efecto: "", mod: {}, bloqueo: "", marcada: false })));

export class ModeloVampiro extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      concepto: texto(), insignia: texto(),
      atributos: new SchemaField(Object.fromEntries(Object.keys(ATRIBUTOS).map(k => [k, entero(2, 0, 6)]))),
      sangre: entero(0, 0, SANGRE_MAX),
      equipo: new ArrayField(new SchemaField({
        nombre: texto(), usos: entero(3, 0, 9), max: entero(3, 1, 9), bono: entero(1, 0, 5), req: texto(),
        dado: si(true), nota: texto(), corchete: entero(0, 0, 6)
      })),
      botin: new SchemaField({ nombre: texto(), usos: entero(3, 0, 9), max: entero(3, 1, 9), bono: entero(1, 0, 5), req: texto() }),
      habilidades: new ArrayField(poder()),
      mejoras: new ArrayField(poder()),
      lesiones: new ArrayField(new ArrayField(lesion()), { initial: LESIONES_VACIAS }),
      ultimoGesto: texto(),
      flashback: si(), derribado: si(), gestoHecho: si(),
      notas: new HTMLField({ required: true, blank: true })
    };
  }

  prepareDerivedData() {
    this.efectivos = atributosEfectivos(this.atributos, this.lesiones);
    this.bloqueos = [...bloqueos(this.lesiones)];
    this.muerto = this.lesiones.length === 3 && this.lesiones.every(c => c.length && c.every(l => l.marcada));
  }
}

export class ModeloAmenaza extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      valor: entero(4, 0, 30), ataque: entero(2, 0, 20), desafio: entero(0, 0, 6),
      revive: si(true), crece: si(true), uber: si(), anatema: si(), garras: si(), sinDolor: si(), sinSangre: si(),
      umbral: entero(4, 4, 6), refuerzoValor: entero(0, 0, 6), pagina: entero(61, 0, 999),
      descripcion: texto(), presagio: texto(), sabor: texto(),
      rasgos: new HTMLField({ required: true, blank: true }),
      notas: new HTMLField({ required: true, blank: true })
    };
  }
}

/** Un objeto escénico no tiene atributos de combate ni se cuenta como amenaza. */
export class ModeloObjeto extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { descripcion: new HTMLField({ required: true, blank: true }), notas: new HTMLField({ required: true, blank: true }) };
  }
}
export const MODELOS = { vampiro: ModeloVampiro, amenaza: ModeloAmenaza, objeto: ModeloObjeto };
