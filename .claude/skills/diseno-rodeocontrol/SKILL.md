---
name: diseno-rodeocontrol
description: Principios de diseño UI/UX específicos para RodeoControl. Consultar antes de diseñar o rediseñar cualquier vista, componente, filtro o flujo visible para el usuario final.
---

Audiencia: productores rurales argentinos, muchos de edad
avanzada, poco familiarizados con apps y gestos táctiles
no convencionales.

## Reglas de interacción

- Nunca usar scroll horizontal como único acceso a contenido
  en mobile, sin alternativa visible. El público no descubre
  gestos escondidos por su cuenta. Preferir que el contenido
  haga wrap a múltiples líneas en mobile, aunque ocupe más
  espacio vertical.
- Evitar gamificación (rachas, puntos, medallas) — puede
  sentirse infantil o fuera de lugar para este público.
  Preferir feedback funcional simple (ej: contador de
  "completadas esta semana").
- Botones de acciones que no queremos incentivar (downgrade
  de plan, eliminar, etc.): variant="subtle" o "outline",
  nunca filled ni con el color principal de marca.

## Estructura de contenido

- Listas o feeds de eventos/tareas: agrupar por fecha o nivel
  de urgencia con separadores claros, nunca en columnas
  paralelas de "pendiente vs completado" — eso divide la
  atención del usuario.
- Información secundaria o de bajo uso (ej: repetir un tutorial,
  ayuda extendida): nunca en el área principal de contenido.
  Agrupar con controles afines ya existentes (ej: junto al
  botón de Ayuda) en lugar de crear un nuevo punto de entrada
  visual.

## Identidad visual

- Color de marca: teal (#087f5b / token 'teal' de Mantine)
- Colores semánticos por categoría ya establecidos:
  Salud → rojo · Sanidad → naranja · Reproducción → rosa
  Manejo → azul · Movimientos → ámbar · Ventas → verde/teal
  Bajas → rojo oscuro
- Mobile-first: cualquier diseño nuevo debe probarse mentalmente
  (o visualmente) a 380-400px de ancho antes de darse por
  terminado.
