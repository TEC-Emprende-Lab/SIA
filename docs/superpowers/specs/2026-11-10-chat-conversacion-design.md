# Chat: conversación

Fecha: 2026-11-10. Historia de apoyo: US-COM-001 y US-COM-002. Este diseño cubre solo cómo se ve y se usa el hilo. El tiempo real y los archivos privados quedan para diseños siguientes.

## Decisiones

- Quien puede leer un canal ve el nombre de quien escribió cada mensaje, incluido el Emprendedor.
- El nombre es el de la cuenta de Google/Clerk. SIA lo guarda cuando la persona entra, solo si viene en el token firmado.
- Si todavía no hay nombre guardado, el mensaje muestra el correo.
- El mensaje trae el nombre actual. Un cambio de nombre en Google se refleja en los mensajes anteriores.
- La forma es de burbujas: los demás a la izquierda, con su nombre; los propios a la derecha, con «Tú».
- Los tres canales fijos no cambian. No se crean canales nuevos.
- Editar y revocar siguen exigiendo observación y conservan auditoría.
- La pantalla de Equipo no cambia: el Emprendedor no ve esa lista.

## Identidad

`users` gana `display_name`, texto de hasta 160 caracteres, vacío hasta que haya un nombre verificado.

En cada sesión autenticada, si el token trae un `name` no vacío, o `given_name` y `family_name` que juntos no queden vacíos, SIA recorta espacios y guarda ese texto cuando difiere del actual. Un token sin nombre no borra el nombre ya guardado. El navegador no puede enviar el nombre en el cuerpo.

Hasta que Clerk incluya ese dato en el token de staging y de producción, las personas ya registradas siguen sin `display_name` y el chat usa el correo.

## Mensaje

`MessageOut` suma `author_name`. Al leer, es `display_name` si tiene texto y, si no, el correo. También lo trae un mensaje revocado. El contenido revocado sigue siendo el aviso «Mensaje revocado»; no se devuelve el texto original.

La autorización no cambia: solo quien ya puede leer el canal recibe el mensaje y, con él, el nombre.

## Menciones

Escribir `@` abre a las personas que ya pueden recibir una mención en ese canal. La API nueva lista `id`, `name` y `role`. `name` usa la misma regla que `author_name`: nombre guardado o, si falta, correo. Solo entran quienes pasan la misma regla que hoy rechaza un destinatario no autorizado. El Emprendedor puede usarla porque puede mencionar. No es la consulta de Equipo y no lista asignaciones revocadas ni personas ajenas al emprendimiento.

Al enviar, `mentioned_user_ids` lleva los identificadores elegidos. La validación y la alerta interna siguen como están. No se puede mencionar a quien el selector no ofreció.

## Referencias

`/objetivos` y `/actividades` siguen abriendo el selector del ciclo actual. Un botón abre el mismo selector. La ficha queda en el borrador y, ya enviada, debajo del texto. La API sigue validando canal, ciclo y recurso.

## Pantalla

El riel de Gestión de proyecto, Finanzas y Reuniones se mantiene, con el contador de no leídos.

En el hilo, cada día tiene un separador. Los mensajes seguidos de la misma persona no repiten el nombre. Un mensaje con revisión mayor a 1 y no revocado dice «editado». El menú de un mensaje propio ofrece Editar y Revocar; ambos piden la observación antes de llamar a la API.

El compositor está al pie. Enter envía. Mayús+Enter inserta un salto de línea. El canal revocado no permite escribir.

Hasta el diseño del tiempo real se conservan el botón de actualizar y el texto de que la conversación se actualiza al abrir el canal. Abrir el canal sigue marcando la lectura en el último mensaje visible.

## Fuera de este diseño

- Mensajes que llegan solos y actualización del contador sin abrir el canal.
- Archivos adjuntos, tipos MIME y tamaño.
- Correo de las menciones.
- Canales nuevos, hilos de respuesta, reacciones y presencia.
- Cambiar quién ve la pantalla de Equipo.

## Pruebas

- Un token con nombre guarda `display_name`; uno sin nombre no lo borra.
- Quien lee el canal recibe `author_name`; quien no tiene acceso no recibe el mensaje.
- La lista de `@` incluye solo destinatarios autorizados y el Emprendedor puede consultarla.
- Enviar con una mención elegida manda su id y rechaza un id ajeno.
- La pantalla muestra «Tú» en lo propio, el nombre o el correo en lo ajeno, «editado» y «Mensaje revocado».
- Enter envía y Mayús+Enter no envía.
