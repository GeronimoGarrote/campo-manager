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
│   ├── Suscripcion.tsx
│   └── AceptarInvitacion.tsx  # Pantalla de join por token de invitación
├── components/
│   ├── ModalAltaAnimal.tsx
│   ├── ModalFichaVaca.tsx   # Ficha completa del animal (historial, eventos, baja)
│   ├── ModalTransferencia.tsx
│   ├── ModalGraficoPeso.tsx
│   ├── ModalAltaDesdeBaston.tsx
│   ├── AllflexScanner.tsx
│   ├── OnboardingTour.tsx     # Tour de bienvenida para usuarios nuevos
│   ├── HelpDrawer.tsx         # Drawer de ayuda contextual por sección
│   ├── SugerenciaDescarga.tsx # Banner teal (mobile) para instalar la PWA
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
    ├── useWebSerialAllflex.ts # Lector RFID por Web Serial
    └── useInstallPrompt.ts  # Detecta disponibilidad de instalación PWA (Android/iOS)
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
toros_servicio_ids: string[],
estado_corporal (numeric nullable, escala 1–5 con medios),
dientes (integer nullable)
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
detalle, monto,
venta_id (UUID, nullable, FK a ventas)
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

### `notas_campo`
```
id, establecimiento_id, contenido (text), created_at
```
Notas libres sin fecha ni estado de completado.
Visibles y editables por todos los roles del campo.
RLS basada en tiene_acceso_a_campo() sobre establecimiento_id.

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

### `campo_miembros`
```
establecimiento_id (FK), user_id (UUID),
rol: 'PEON' | 'VETERINARIO',
apodo: string | null
```
Relación N:M entre usuarios y campos ajenos (DUENO no tiene fila aquí, es el `user_id` del `establecimiento`).

### `campo_invitaciones`
```
id, establecimiento_id, rol: 'PEON' | 'VETERINARIO',
token (UUID), usado (boolean), created_at
```
Un token de un solo uso que, al visitarse con `?token=<uuid>` en la URL, añade al usuario autenticado como miembro.

### `ventas`
```
id, establecimiento_id, fecha (DATE),
tipo: MASIVA | LOTE | INDIVIDUAL,
destino, comprador, modalidad,
monto_total, gastos_total, kilos_totales,
animales_ids (UUID[]), created_at
```
Vincula movimientos de caja con animales vendidos.
El icono en Economia consulta esta tabla al clickear.

### `sesiones_baston`
```
id, nombre, establecimiento_id,
creado_por (UUID nullable, FK a auth.users),
estado: 'ACTIVA' | 'LISTA' | 'PROCESADA',
animales_ids (uuid[]),
notas (text nullable),
created_at, updated_at
```
ACTIVA = escaneo en curso. LISTA = escaneo terminado, listo para procesar en Masivos.
PROCESADA = ya aplicada en Masivos o exportada.
RLS basada en tiene_acceso_a_campo() sobre establecimiento_id.
Deuda técnica conocida: cada escaneo hace UPDATE del array completo desde
memoria. En la práctica no genera problemas (un bastón por sesión).
Solución futura si se necesita: RPC con array_append atómico en Postgres.

### `tags_pendientes`
```
id, establecimiento_id,
eid (text — la cadena del EID escaneado),
creado_por (UUID nullable, FK auth.users),
asignado (boolean, default false),
animal_id (UUID nullable, FK animales — se llena al asignar),
grupo_nombre (text nullable),
created_at
```
Workflow: PEON escanea tags con el bastón → se insertan con asignado=false.
DUENO entra, ve la lista y asigna cada EID a un animal existente:
UPDATE animales SET caravana_electronica = eid + UPDATE tags_pendientes SET asignado = true.
Si el EID ya existe en animales.caravana_electronica al momento del escaneo,
se acumula en estado local eidsYaRegistrados (no se persiste).
RLS basada en tiene_acceso_a_campo() sobre establecimiento_id.

### `grupos_tags`
```
id, establecimiento_id, nombre (text),
creado_por (UUID nullable, FK auth.users), created_at
```
Grupos de C.E creados por el usuario. Persisten aunque no tengan tags escaneados.
Se relacionan con tags_pendientes por nombre (texto, sin FK).
RLS basada en tiene_acceso_a_campo() sobre establecimiento_id.

### RPCs disponibles
- `buscar_campo_por_renspa({ buscar_renspa })` → `{ id, nombre }`
- `obtener_caravanas_perdidas({ ids })` → `[{ id, caravana }]`
- `obtener_miembros_campo({ p_campo_id })` → `[{ user_id, email, rol, apodo }]`
- `aceptar_invitacion({ p_token })` → procesa el token e inserta en `campo_miembros`

---

## Sistema Multi-usuario

### Flujo de membresías

1. DUENO genera un link desde modal config → inserta en `campo_invitaciones` con un UUID aleatorio.
2. Invitado abre `?token=<uuid>` → si ya tiene sesión, se llama `aceptar_invitacion` automáticamente; si no, ve la pantalla de login/registro y se procesa al iniciar sesión.
3. El miembro queda en `campo_miembros` con el `rol` del token.
4. DUENO puede revocar invitaciones no usadas o remover miembros desde el modal config.

### Estado en App.tsx

```typescript
// Mapa con el rol del usuario autenticado en cada campo
const [rolesPorCampo, setRolesPorCampo] = useState<
  Record<string, 'DUENO' | 'PEON' | 'VETERINARIO'>
>({});

// Derivado: rol en el campo activo. Default DUENO si no hay fila (nunca debería ocurrir).
const rolActual: 'DUENO' | 'PEON' | 'VETERINARIO' =
  campoId ? (rolesPorCampo[campoId] ?? 'DUENO') : 'DUENO';
```

### `loadCampos` — patrón de dos queries

**No usar embedded join** `campo_miembros.select('*, establecimientos(*)')` — puede fallar silenciosamente por interacciones RLS/PostgREST. El patrón correcto usa dos queries paralelas:

```typescript
const [{ data: propios }, { data: membresias }] = await Promise.all([
  supabase.from('establecimientos').select('*').eq('user_id', user.id),
  supabase.from('campo_miembros').select('establecimiento_id, rol').eq('user_id', user.id),
]);
// propios → DUENO; membresias → ids de campos ajenos, se fetchean en una tercera query .in()
```

### Apodo de miembros

`campo_miembros.apodo` es un alias editable que el DUENO asigna a cada miembro. Cuando está definido, se muestra en lugar del email en la UI. Se actualiza via `UPDATE campo_miembros SET apodo = $1 WHERE establecimiento_id = $2 AND user_id = $3`.

### Matriz de permisos

| Acción | DUENO | PEON | VETERINARIO |
|--------|-------|------|-------------|
| Ver Hacienda / Lotes / Agenda / Masivos / Agricultura | ✅ | ✅ | ✅ |
| Registrar eventos (pesaje, vacuna, etc.) | ✅ | ✅ | ✅ |
| Ver Caja / Economía | ✅ | ❌ | ❌ |
| Ver Mi Plan / Suscripción | ✅ | ❌ | ❌ |
| Vender animales (ModalFichaVaca + Masivos) | ✅ | ❌ | ❌ |
| Trasladar animales (ModalFichaVaca) | ✅ | ❌ | ❌ |
| Traslado a Otro Campo (Economía) | ✅ | ❌ | ❌ |
| Gestionar equipo / invitaciones | ✅ | ❌ | ❌ |

**Regla general**: PEON y VETERINARIO tienen acceso completo excepto a lo financiero (Caja, Mi Plan) y a acciones de venta/traslado de animales.

### Gates en el código

- **Navbar**: `{rolActual === 'DUENO' && <NavLink label="Caja / Economía" .../>}` y `Mi Plan`
- **ModalFichaVaca**: botones "Vender" y "Trasladar" bajo `rolActual === 'DUENO'`
- **Masivos**: tipo `VENTA` filtrado del Select para no-DUENO
- **Economia**: bloque completo de acceso restringido si `rolActual !== 'DUENO'`; ítem "Traslado a Otro Campo" bajo `rolActual === 'DUENO'`
- **`rolActual` se pasa como prop** a: `Hacienda`, `Masivos`, `Lotes`, `Agricultura`, `Economia`, `ModalFichaVaca`, `ModalAltaAnimal`, `ModalAltaDesdeBaston`

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

### Arquitectura del bastón de escaneo
La conexión COM (Web Serial API) es global y vive en `App.tsx` via `useWebSerialAllflex`.
Cada vista recibe `registrarScanHandler(fn)` como prop y registra su handler en un useEffect.
El `scanHandlerRef` en App.tsx rutea los scans COM a la vista activa.
HID (useLectorAllflex) sigue siendo per-vista con su propio isActive.
Modos disponibles: 'com' (Allflex) | 'rodeocontrol' (ESP32 con prefijo RC:).
Prefijo RC:: el ESP32 manda RC:EID, la app stripea el prefijo. En modo 'rodeocontrol'
los datos sin prefijo se descartan. El Switch del lector manda START/STOP al ESP32
via enviarComando() cuando modo === 'rodeocontrol'.

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
| RPC `aceptar_invitacion` | Lógica de membresía en server-side, no mover al cliente |
| RPC `obtener_miembros_campo` | Retorna `email` vía `auth.users`; el rol autenticado no puede leer esa tabla directo |

---

## Fases de refactor activas

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1 | ✅ Completo | Este archivo CLAUDE.md |
| 2 | ✅ Completo | Crear `src/types.ts` con todas las interfaces |
| 3 | ✅ Completo | Manejo de errores en fetches de App.tsx |
| 4 | ⏸ Pausado | Extraer hooks: `useAnimales`, `useSuscripcion`, `useAuth` — esperar necesidad concreta |

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
