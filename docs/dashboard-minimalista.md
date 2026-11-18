# Interfaz uniforme de SIA — 2026-11-18

Solicitud: simplificar el frontend, especialmente el dashboard, con una apariencia sobria y profesional, transparencia discreta y más color en tonos verdes, grises claros y blancos.

## Alcance y trazabilidad

Presentación del resumen y de los módulos existentes: US-PRO-001/002, US-PM-001/002/003 y los documentos comunes de objetivos, reuniones y alertas. No cambia contratos, autorización, estados de negocio, cálculos de avance ni registros históricos.

- `ProjectDashboard` separa la presentación del resumen de la carga y las acciones de seguimiento.
- El avance y los conteos se leen del resumen de FastAPI; el avance sigue siendo el promedio de los objetivos aprobados, con igual peso.
- Próximos pasos conserva los objetivos pendientes de validación y las primeras cinco actividades sin completar, ordenadas por fecha. La lista completa sigue accesible en Objetivos y actividades.
- El plan conserva todos los objetivos, sus estados y porcentajes. El historial conserva las cinco decisiones recientes dentro de un desplegable.
- Reuniones, acuerdos y alertas personales mantienen su carga, alcance, errores independientes y actualización manual. Las explicaciones extensas quedan en desplegables; los acuerdos no adquieren un estado de cumplimiento.
- El contenedor del proyecto elimina la franja repetida del nombre y el segundo control de cuenta. El programa y el nombre del ciclo se conservan en el selector, con texto completo al pasar el cursor; el control de cuenta permanece en la barra lateral.

## Cobertura

`theme.css` centraliza fondos, texto, bordes, estados y acentos. Instrument Sans y la paleta verde salvia se comparten entre dashboard, diagnóstico, ambiciones, objetivos y actividades, evidencias, evolución, informes, reuniones y calendario, chat, finanzas, expedientes, administración, bandeja, acceso y formularios. Los errores siguen en rojo y las advertencias en tonos arena.

La integración parte de `develop` en `f4dd0df`: conserva la carga progresiva, cancelación de consultas, reintentos independientes, navegación según rol y mensajes operativos. El historial de validaciones sigue consultándose por separado y conserva su estado de carga, error y reintento. Su ausencia no bloquea el resumen.

## Diseño

Fondo gris cálido, superficies blancas y navegación verde salvia. La sección activa se distingue en verde bosque; el resumen de avance tiene una superficie verde muy suave. Los íconos conservan la familia Lucide, con trazo uniforme y fondos discretos; las alertas usan un acento arena. No se depende exclusivamente del color para expresar estados.

Instrument Sans variable se sirve desde `apps/web/public/fonts`, con `font-display: swap` y fuentes del sistema como respaldo. No se consulta un servicio de fuentes externo durante la navegación ni la compilación. Se incluye su licencia SIL OFL 1.1. Fuente: [repositorio de Google Fonts](https://github.com/google/fonts/tree/main/ofl/instrumentsans), proyecto original [Instrument Sans](https://github.com/Instrument/instrument-sans).

El efecto de vidrio se limita a la barra superior y la navegación. Hay una base opaca para navegadores sin soporte y para preferencias de menor transparencia o mayor contraste. Se conserva la preferencia de movimiento reducido.

El dashboard pasa de dos columnas a una en pantallas estrechas. Los textos largos pueden dividirse, los porcentajes tienen etiqueta accesible y se conservan foco visible, navegación y estados vacíos.

## Verificación

- TypeScript, lint y compilación de producción de Next.js con webpack correctos. Se reutilizaron las dependencias instaladas; el lockfile coincide con develop.
- Diez suites Web existentes aprobadas, incluida administración. En Windows se redirigieron sus prefijos temporales /tmp/ mediante un adaptador externo al repositorio. La aserción del indicador de carga se actualizó a su ubicación en el selector de proyecto, conservando los controles de accesibilidad y permisos.
- Revisión de escritorio del dashboard y una muestra de finanzas/formularios con sus estilos reales. Los registros son ejemplos aislados y no se incluyen en la aplicación. La revisión inicial del dashboard también comprobó anchos de 320, 390, 768, 1024 y 1440 px.
- No se verificó un recorrido autenticado completo contra la API. Esta revisión visual no certifica capacidad concurrente ni sustituye la validación de staging.

## Despliegue

Solo cambia Web: no requiere migraciones ni desplegar API o worker. Seguir el flujo de PR hacia develop y validación de staging antes de promover a main. El despliegue y su resultado deben comprobarse por separado del commit y de CI.
