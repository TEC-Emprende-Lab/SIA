# Perfil e idioma de la interfaz

Correcciones de presentación solicitadas el 4 de noviembre de 2026.

El perfil lateral utiliza únicamente la foto de la cuenta de Clerk en un espacio
de 38 por 38 píxeles. Se elimina el avatar duplicado con iniciales, se mantiene el
acceso al menú de cuenta y el correo se recorta cuando no cabe junto a la imagen.

El proveedor compartido de Clerk utiliza su catálogo oficial en español para el
acceso, registro y gestión de cuenta. Se completan las traducciones ausentes de
verificación de solicitudes, acceso combinado, claves de acceso y estados comunes
del perfil. Las verificaciones financieras también usan etiquetas en español.

Los textos de la web dejan de utilizar puntos medios para separar información.
El pie muestra Catalitec y el nombre del sistema en líneas separadas. Las demás
etiquetas utilizan comas o frases conectadas, sin cambiar los datos registrados.

La corrección se vincula al requisito de interfaz simple, consistente y comprensible
de [visión y alcance](00-nucleo-comun/vision-y-alcance.md) y a la presentación de los
recorridos existentes. La historia específica de presentación permanece `TBD`.
No se alteran reglas de negocio, autorizaciones, migraciones ni versiones históricas.

La suite Web, lint, TypeScript y compilación se verifican localmente. La revisión
aislada del componente real y su CSS compilado a 1440, 1024 y 390 píxeles confirma
un solo avatar, correo dentro del perfil y ausencia de desbordamiento horizontal
en la barra lateral. Usa un sustituto visual de Clerk, sin sesión ni datos remotos.

Pendientes la publicación y la revisión con una sesión real de Clerk en staging.
La integración en Git no certifica que producción muestre estos cambios.
