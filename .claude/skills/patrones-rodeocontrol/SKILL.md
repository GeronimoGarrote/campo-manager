---
name: patrones-rodeocontrol
description: Patrones de datos y arquitectura específicos de RodeoControl. Consultar al crear cualquier vista, componente o función nueva que liste, filtre o elimine animales, o que modifique tablas de Supabase.
---

## Animales activos vs inactivos

Nunca filtrar manualmente con arrays de estados repetidos.
Usar siempre el helper centralizado:

  import { esAnimalActivo } from '../types';
  animales.filter(esAnimalActivo)

Excepción: la vista de Archivo/Bajas filtra explícitamente
VENDIDO || MUERTO (sin ELIMINADO) — ese caso es intencional,
no usar esAnimalActivo ahí.

## Cascada al dar de baja un animal

Cualquier flujo que cambie el estado de un animal a VENDIDO,
MUERTO o ELIMINADO debe limpiar también sus tareas pendientes
vinculadas en la tabla `agenda`:

  await supabase.from('agenda').delete()
    .eq('animal_id', animalId).eq('completado', false);

Si se agrega una tabla nueva que referencia animal_id, evaluar
si necesita la misma limpieza.

## Patrón de migraciones en Supabase

Toda migración va acompañada de su política RLS correspondiente
en el mismo cambio, nunca por separado. Usar tiene_acceso_a_campo()
como base para nuevas políticas que dependan de establecimiento_id,
salvo casos ya documentados como excepción en CLAUDE.md
(suscripciones, por ejemplo).

Antes de aplicar una migración con cambios de RLS, verificar el
estado actual de las políticas existentes con una query a
pg_policies antes de modificar nada.
