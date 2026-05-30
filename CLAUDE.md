# CLAUDE.md — RodeoControl

Archivo de instrucciones permanentes para Claude Code.
Leer completo antes de cualquier cambio en el proyecto.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 18 + TypeScript + Vite |
| UI | Mantine v7 + `@mantine/hooks` + `@mantine/notifications` |
| Iconos | `@tabler/icons-react` (solo outline, nunca `-filled`) |
| Backend | Supabase (Auth + PostgreSQL + RPC) |
| Hardware | Web Serial API + HID para lectores RFID Allflex |

---

## Estructura de carpetas

```
src/
├── App.tsx                  # God Component: auth + estado global + navegación
├── supabase.ts              # Cliente Supabase (singleton)
├── views/                   # Páginas completas
│   ├── Login.tsx
│   ├── Inicio.tsx
│   ├── Hacienda.tsx         # Lista y filtros de animales
│   ├── Economia.tsx         # Caja, movimientos, PIN de bloqueo
│   ├── Agricultura.tsx      # Potreros, parcelas, labores
│   ├── Masivos.tsx          # Operaciones en lote (ventas, vacunas, etc.)
│   ├── Lotes.tsx            # Shell de navegación de lotes/grupos
│   ├── Agenda.tsx
│   ├── Actividad.tsx
│   └── Suscripcion.tsx
├── components/
│   ├── ModalAltaAnimal.tsx
│   ├── ModalFichaVaca.tsx   # Ficha completa del animal (historial, eventos, baja)
│   ├── ModalTransferencia.tsx
│   ├── ModalGraficoPeso.tsx
│   ├── ModalAltaDesdeBaston.tsx
│   ├── AllflexScanner.tsx
│   ├── Hacienda/
│   │   └── ModalImportarExcel.tsx
│   └── Lotes/
│       ├── VistaLotesActivos.tsx
│       ├── VistaHistorial.tsx
│       ├── VistaDetalleLote.tsx
│       ├── VistaDetalleHistorico.tsx
│       └── ModalVentaLote.tsx
└── hooks/
    ├── useLectorAllflex.ts  # Lector RFID por HID (teclado)
    └── useWebSerialAllflex.ts # Lector RFID por Web Serial
```

---

## Tablas Supabase

Todas las tablas usan `establecimiento_id` (UUID) como clave de tenant.
**Nunca omitir este filtro en ninguna query.**

### `animales`
```
id, caravana, caravana_electronica,
categoria: 'Vaca' | 'Vaquillona' | 'Ternera' | 'Ternero' | 'Novillo' | 'Toro',
sexo: 'M' | 'H',
estado: ver Estados del Animal,
condicion: 'SANA' | 'ENFERMA' | 'LASTIMADA' | combinación con ', ',
origen: 'PROPIO' | 'COMPRADO' | 'NACIDO',
detalle_baja, detalles, destacado,
fecha_nacimiento, fecha_ingreso, fecha_servicio,
madre_id, castrado, en_transito,
establecimiento_id, potrero_id, parcela_id, lote_id,
toros_servicio_ids: string[]
```

### `eventos`
```
id, animal_id, establecimiento_id,
fecha_evento (ISO string),
tipo: ver Tipos de Evento,
resultado, detalle, costo,
datos_extra (jsonb)
```

### `caja`
```
id, establecimiento_id, fecha (YYYY-MM-DD),
tipo: 'INGRESO' | 'EGRESO' | 'TRASLADO',
categoria: 'Hacienda (Venta/Compra)' | 'Sanidad Veterinaria' | 'Agricultura / Semillas' | 'Alimentación / Nutrición' | ...,
detalle, monto
```

### `potreros`
```
id, nombre, hectareas, establecimiento_id,
estado: 'LIBRE' | 'OCUPADO' | 'SEMBRADO' | 'DESCANSO',
cultivo_actual
```

### `parcelas`
```
id, nombre, hectareas, potrero_id, establecimiento_id
```

### `lotes`
```
id, nombre, establecimiento_id
```

### `lotes_eventos`
```
id, fecha, tipo, detalle, costo, establecimiento_id
```

### `lotes_historicos`
```
id, nombre_lote, vendido, fecha_cierre, establecimiento_id
```

### `labores`
```
id, potrero_id, establecimiento_id, fecha, actividad, cultivo, detalle, costo
actividad: 'FUMIGADA' | 'SIEMBRA' | 'COSECHA' | ...
```

### `agenda`
```
id, animal_id, establecimiento_id, fecha_programada, completado
```

### `transferencias`
```
id, campo_origen_id, campo_destino_id,
animales_ids (uuid[]), precio_total, detalles, origen_nombre,
estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA'
```

### `suscripciones`
```
id, user_id, plan_nombre, estado, fecha_vencimiento,
limite_animales, limite_establecimientos
```

### RPCs disponibles
- `buscar_campo_por_renspa({ buscar_renspa })` → `{ id, nombre }`
- `obtener_caravanas_perdidas({ ids })` → `[{ id, caravana }]`

---

## Estados del Animal

```
ACTIVO | PREÑADA | VACÍA | EN SERVICIO | APARTADO
EN LACTANCIA | LACTANTE | PREÑADA Y LACTANDO
VENDIDO | MUERTO | ELIMINADO
```

**Activos** = todo excepto VENDIDO, MUERTO, ELIMINADO.
`en_transito: true` indica venta entre usuarios pendiente de aceptación.

## Tipos de Evento

```
PESAJE | ENFERMEDAD | LESION | CURACION | TRATAMIENTO
VACUNACION | OTRO | TACTO | SERVICIO | PARTO | DESTETE
CAPADO | RASPAJE | APARTADO | VENTA | BAJA
TRASLADO_SALIDA | TRASLADO_INGRESO | RESTAURACION | BORRADO
```

---

## Reglas críticas del negocio

### Soft delete
**Nunca** usar `DELETE` en la tabla `animales`.
Baja = `UPDATE animales SET estado = 'ELIMINADO'`.
Los eventos históricos del animal se conservan siempre.

### Candado de suscripción
Antes de insertar un animal, verificar:
```typescript
const activos = animales.filter(a =>
  !['VENDIDO','MUERTO','ELIMINADO'].includes(a.estado)
).length;
if (activos >= datosSuscripcion.limite_animales) { /* bloquear */ }
```
Igual para `establecimientos` vs `limite_establecimientos`.

### Fechas locales
**Nunca** usar `new Date().toISOString()` para fechas de input.
Usar siempre:
```typescript
const getHoyIso = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
};
```

### Formato de fecha para mostrar
```typescript
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const parts = dateString.split('T')[0].split('-');
  return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
};
```

### Economía automática
Siempre que se registre un evento con `costo > 0`,
insertar automáticamente en `caja` como EGRESO.
Siempre que se registre una VENTA,
insertar en `caja` como INGRESO.

---

## Convenciones de código

### Naming
- Funciones: `camelCase`
- Componentes: `PascalCase`
- Tipos de evento y estados: `UPPER_SNAKE_CASE`
- Props interfaces: `NombreComponenteProps`

### TypeScript
- Mover cualquier `any` nuevo a `src/types.ts` (Fase 2 del plan de refactor).
- Nunca agregar `any` sin un comentario `// TODO: tipar` como mínimo.
- Los objetos de Supabase usan `snake_case` (nombres de columna).

### Componentes
- Mantine siempre antes que HTML nativo.
- `useDisclosure()` de `@mantine/hooks` para modales (no `useState(false)`).
- `notifications` de `@mantine/notifications` para feedback (no `alert()`).
  Excepción: confirmaciones destructivas (`borrarCampo`) pueden usar `prompt()`.
- No usar `<form>` HTML. Usar handlers `onClick` / `onChange`.

### Manejo de errores Supabase
```typescript
// Patrón correcto
const { data, error } = await supabase.from('tabla').select('*')...;
if (error) {
  console.error('[fetchNombre]', error);
  // Mostrar al usuario con notifications, no con alert
  return;
}
```

### Estado global
Todo el estado global vive en `App.tsx` y baja por props.
Las vistas **no** fetchean datos propios (excepto datos locales como `labores` en `Agricultura`).
El patrón es: `App.tsx` fetcha → pasa como props → la vista renderiza.

---

## Lo que NO tocar sin análisis previo

| Archivo/área | Motivo |
|---|---|
| `supabase.ts` | Singleton, no duplicar el cliente |
| Lógica de `borrarCampo` | Elimina en cascada todo el establecimiento |
| `restaurarAnimal` en ModalFichaVaca | Revierte caja además del estado |
| `en_transito` flag | Coordinado con `transferencias`, no cambiar sin ambos |
| Cálculo de días de gestación | 283 días es el valor ganadero correcto para bovinos |
| RPC `buscar_campo_por_renspa` | Función de Supabase, no replicar en cliente |

---

## Fases de refactor activas

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1 | ✅ Completo | Este archivo CLAUDE.md |
| 2 | Pendiente | Crear `src/types.ts` con todas las interfaces |
| 3 | Pendiente | Manejo de errores en fetches de App.tsx |
| 4 | Pendiente | Extraer hooks: `useAnimales`, `useSuscripcion`, `useAuth` |

Antes de avanzar a Fase 3, la Fase 2 debe estar completa.
Los hooks de Fase 4 deben importar tipos de `src/types.ts`, no redefinirlos.

---

## Comandos útiles al iniciar una sesión

```bash
# Ver qué archivos fueron modificados recientemente
git diff --name-only HEAD~1

# Buscar todos los `any` explícitos en src/
grep -rn ": any" src/ --include="*.ts" --include="*.tsx"

# Buscar queries Supabase sin manejo de error
grep -rn "supabase.from" src/ --include="*.tsx" | grep -v "error"

# Verificar que el build no tiene errores de tipos
npx tsc --noEmit
```
