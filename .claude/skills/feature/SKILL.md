---
name: feature
description: Implementar una feature o fix en RodeoControl siguiendo las convenciones del proyecto. Usar para cualquier cambio de código no trivial.
---

Antes de tocar código: leer completo cada archivo mencionado
en el pedido, sin asumir su contenido de memoria.

Seguir las convenciones de CLAUDE.md sin excepción, salvo que
el pedido explícitamente las contradiga.

No tocar archivos fuera del scope pedido, salvo que sea
estrictamente necesario para que el cambio funcione (en ese
caso, mencionarlo explícitamente al terminar).

Si algo del pedido no encaja con el código real que encontrás,
usar criterio propio, resolver de la forma más simple y segura,
y documentar brevemente la decisión.

Al terminar: confirmar que el comportamiento existente no cambió
salvo lo explícitamente pedido. El hook de tsc ya corre solo
después de cada edición.

$ARGUMENTS
