// ─── Union types ───────────────────────────────────────────────────────────────

export type EstadoAnimal =
  | 'ACTIVO'
  | 'PREÑADA'
  | 'VACÍA'
  | 'EN SERVICIO'
  | 'APARTADO'
  | 'EN LACTANCIA'
  | 'LACTANTE'
  | 'PREÑADA Y LACTANDO'
  | 'VENDIDO'
  | 'MUERTO'
  | 'ELIMINADO';

export type CategoriaAnimal =
  | 'Vaca'
  | 'Vaquillona'
  | 'Ternera'
  | 'Ternero'
  | 'Novillo'
  | 'Toro';

export type SexoAnimal = 'M' | 'H' | 'I';

export type OrigenAnimal = 'PROPIO' | 'COMPRADO' | 'NACIDO';

/** Valores base de condición; el campo puede contener combinaciones separadas por ', ' */
export type CondicionBase = 'SANA' | 'ENFERMA' | 'LASTIMADA';

export type PelajeAnimal =
  | 'Negro'
  | 'Colorado'
  | 'Careta Negro'
  | 'Careta Colorado'
  | 'Blanco y Negro';

export type TipoEvento =
  | 'PESAJE'
  | 'ENFERMEDAD'
  | 'LESION'
  | 'CURACION'
  | 'TRATAMIENTO'
  | 'VACUNACION'
  | 'OTRO'
  | 'TACTO'
  | 'SERVICIO'
  | 'PARTO'
  | 'DESTETE'
  | 'CAPADO'
  | 'RASPAJE'
  | 'APARTADO'
  | 'VENTA'
  | 'BAJA'
  | 'TRASLADO_SALIDA'
  | 'TRASLADO_INGRESO'
  | 'RESTAURACION'
  | 'BORRADO'
  | 'MOVIMIENTO_POTRERO'
  | 'CAMBIO_LOTE';

export type EstadoPotrero = 'LIBRE' | 'OCUPADO' | 'SEMBRADO' | 'DESCANSO';

export type ActividadLabor =
  | 'SIEMBRA'
  | 'FUMIGADA'
  | 'COSECHA'
  | 'FERTILIZACION'
  | 'DESMALEZADA'
  | 'OTRO';

export type TipoCaja = 'INGRESO' | 'EGRESO';

export type CategoriaCaja =
  | 'Alquileres'
  | 'Alimentación / Nutrición'
  | 'Sanidad Veterinaria'
  | 'Agricultura / Semillas'
  | 'Maquinaria / Combustible'
  | 'Infraestructura / Alambrados'
  | 'Sueldos / Honorarios'
  | 'Impuestos / Servicios'
  | 'Traslado Insumo'
  | 'Otros'
  | 'Hacienda (Venta/Compra)'
  | 'Hacienda (Sanidad/Manejo)'
  | 'Venta Hacienda';

export type EstadoTransferencia = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export type TipoAgenda = 'MANUAL' | 'PARTO_ESTIMADO';

export type PlanSuscripcion = 'PRUEBA' | 'BASICO' | 'PRO' | 'PREMIUM';

export type EstadoSuscripcion = 'ACTIVO' | 'VENCIDO' | 'SUSPENDIDO';

export const esAnimalActivo = (a: { estado: string; en_transito?: boolean }) =>
    !['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(a.estado) && !a.en_transito;

// ─── Entidades ─────────────────────────────────────────────────────────────────

export interface Establecimiento {
  id: string;
  nombre: string;
  created_at: string;
  user_id?: string;
  renspa?: string;
  pin_caja?: string;
}

export interface Animal {
  id: string;
  created_at: string;
  establecimiento_id: string;
  caravana: string;
  caravana_electronica?: string;
  categoria: CategoriaAnimal;
  sexo: SexoAnimal;
  estado: EstadoAnimal;
  condicion?: string;
  castrado?: boolean;
  fecha_nacimiento?: string;
  fecha_ingreso?: string;
  fecha_servicio?: string;
  madre_id?: string;
  origen: OrigenAnimal;
  detalle_baja?: string;
  detalles?: string;
  destacado?: boolean;
  potrero_id?: string;
  parcela_id?: string;
  lote_id?: string;
  toro_servicio_id?: string;
  toros_servicio_ids?: string[];
  en_transito?: boolean;
  pelaje?: PelajeAnimal;
}

export interface Evento {
  id: string;
  created_at: string;
  establecimiento_id: string;
  animal_id: string;
  fecha_evento: string;
  tipo: TipoEvento;
  resultado?: string;
  detalle?: string;
  costo?: number;
  datos_extra?: Record<string, unknown>;
}

export interface Potrero {
  id: string;
  created_at: string;
  establecimiento_id: string;
  nombre: string;
  hectareas?: number;
  estado?: EstadoPotrero;
  cultivo_actual?: string;
}

export interface Parcela {
  id: string;
  created_at: string;
  establecimiento_id?: string;
  potrero_id?: string;
  nombre: string;
  hectareas?: number;
}

export interface Labor {
  id: string;
  created_at: string;
  establecimiento_id: string;
  potrero_id: string;
  parcela_id?: string;
  fecha: string;
  actividad: ActividadLabor;
  cultivo?: string;
  detalle?: string;
  costo?: number;
}

export interface Lote {
  id: string;
  created_at: string;
  establecimiento_id?: string;
  nombre: string;
}

export interface LoteEvento {
  id: string;
  created_at: string;
  establecimiento_id?: string;
  lote_id?: string;
  fecha: string;
  tipo: string;
  detalle?: string;
  cantidad?: string;
  costo?: number;
}

export interface LoteHistorico {
  id: string;
  created_at?: string;
  establecimiento_id?: string;
  lote_id?: string;
  nombre_lote: string;
  fecha_cierre: string;
  cantidad_animales: number;
  animales_ids?: string[];
  peso_inicial?: number;
  peso_final?: number;
  ganancia_promedio?: number;
  adpv?: string;
  dias_ciclo?: number;
  vendido?: boolean;
  ingreso_total?: number;
  costo_total?: number;
}

export interface Caja {
  id: string;
  created_at: string;
  establecimiento_id: string;
  fecha: string;
  tipo: TipoCaja;
  categoria: CategoriaCaja;
  detalle: string;
  monto: number;
  referencia_id?: string;
}

export interface Transferencia {
  id: string;
  created_at?: string;
  campo_origen_id?: string;
  campo_destino_id?: string;
  origen_nombre?: string;
  animales_ids: string[];
  precio_total?: number;
  estado?: EstadoTransferencia;
  detalles?: string;
}

export interface Agenda {
  id: string;
  created_at: string;
  establecimiento_id?: string;
  animal_id?: string;
  fecha_programada: string;
  titulo: string;
  descripcion?: string;
  tipo?: TipoAgenda;
  completado?: boolean;
}

export interface Suscripcion {
  // id opcional: App.tsx sintetiza una suscripción default (sin fila en DB) cuando no existe
  id?: string;
  user_id?: string;
  plan_nombre?: PlanSuscripcion;
  estado?: EstadoSuscripcion;
  fecha_vencimiento?: string;
  limite_animales: number;
  limite_establecimientos: number;
  link_pago_mp?: string;
  notas_admin?: string;
}