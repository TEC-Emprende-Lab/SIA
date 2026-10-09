"""Manual staging-only demo import. Never imported by startup or migrations.

US-PRO-001/004/005/006: synthetic work plans, diagnostics and report sources.
No fabricated human approvals, real customers, uploads, purchases or emails.
"""

import argparse
import asyncio
import json
from datetime import UTC, date, datetime, timedelta
from typing import Any, TypedDict
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

import app.models  # noqa: F401 -- register all metadata
from app.audit.service import write_audit
from app.core.config import settings
from app.db.base import Base
from app.db.session import async_session, engine
from app.models.comunicacion import Agreement, Channel, Meeting, Message, Minutes
from app.models.expediente import (
    Entrepreneurship,
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramEnrollment,
)
from app.models.informes import TechnicalReport
from app.models.seguimiento import (
    Activity,
    Ambition,
    CanvasArea,
    CycleCanvas,
    Diagnostic,
    Evidence,
    Objective,
    ProgramCanvas,
)
from app.models.user import User
from app.modules.informes.service import _compose

BATCH = "sia-staging-demo-2026-10-v1"
HOST = "n4oco8kccss0kssoc4s0ccs0"
DATABASE = "sia_staging"
ORIGIN = "https://sia.dev.neuroboard.app"
NOTICE = "DATOS FICTICIOS DE DEMOSTRACIÓN · Generados para staging; no representan hechos reales."
ANCHOR = date(2026, 10, 9)


# Six genuinely different work streams per project, in the official canvas order.
# Each tuple: objective, acceptance target, four concrete activities, starting observation.
class DemoProject(TypedDict):
    key: str
    name: str
    team: list[str]
    context: str
    ambitions: list[tuple[str, str]]
    streams: list[tuple[str, str, list[str], str]]


PROJECTS: list[DemoProject] = [
    {
        "key": "bruma",
        "name": "Bruma Agro · Riego inteligente",
        "team": [
            "Valeria Solís — electrónica",
            "Diego Araya — agronomía",
            "Camila Mora — operaciones",
        ],
        "context": "Sensores de humedad y recomendaciones de riego para pequeños productores de hortalizas de Cartago. El piloto ficticio abarca ocho parcelas de 500 m², sin automatizar válvulas ni prometer ahorros antes de medirlos.",
        "ambitions": [
            (
                "Reducir el desperdicio de agua en horticultura",
                "Medir consumo por parcela durante seis semanas y contrastar el riego recomendado con una línea base comparable. Meta exploratoria: reducción del 15 %, no un resultado confirmado.",
            ),
            (
                "Construir un servicio accesible para pequeñas fincas",
                "Validar un kit de tres sensores y una suscripción mensual de ₡18.000; separar el costo del hardware del acompañamiento agronómico.",
            ),
            (
                "Convertir el piloto en una operación replicable",
                "Documentar instalación, calibración y soporte para que un técnico pueda activar una finca en menos de dos horas.",
            ),
            (
                "Explorar alianzas regionales en 2027",
                "Aspiración a largo plazo sin objetivo comprometido todavía: evaluar cooperativas una vez concluido el piloto.",
            ),
        ],
        "streams": [
            (
                "Acordar la propuesta de valor y responsabilidades",
                "Una propuesta de valor validable y una matriz de responsabilidades firmable por el equipo.",
                [
                    "Entrevistar al equipo fundador sobre propósito y límites",
                    "Redactar misión y propuesta de valor para productores",
                    "Definir responsables de instalación, soporte y ventas",
                    "Contrastar el mensaje con cinco productores",
                ],
                "El equipo comparte el problema de riego, pero mezcla venta de sensores con asesoría. Falta delimitar quién responde ante una lectura anómala.",
            ),
            (
                "Contrastar la rentabilidad del kit y la suscripción",
                "Modelo unitario con costo del kit, reposición, visitas y tres escenarios de permanencia.",
                [
                    "Cotizar sensores, carcasa y conectividad",
                    "Estimar costo de instalación y visita mensual",
                    "Entrevistar sobre disposición de pago de ₡18.000",
                    "Recalcular margen con reposición del 10 %",
                ],
                "La primera estimación omite desplazamientos y reposición. El precio es una hipótesis, no una tarifa aceptada por clientes.",
            ),
            (
                "Priorizar productores de hortalizas de Cartago",
                "Ocho perfiles de finca y criterios explícitos para seleccionar las parcelas del piloto.",
                [
                    "Definir criterios de tamaño, cultivo y acceso al agua",
                    "Realizar ocho entrevistas de manejo de riego",
                    "Clasificar necesidades y estacionalidad por cultivo",
                    "Seleccionar parcelas y confirmar consentimiento",
                ],
                "Hay conversaciones exploratorias, pero falta distinguir problemas de humedad del suelo de problemas de disponibilidad de agua.",
            ),
            (
                "Probar un canal de captación con asistencia técnica",
                "Comparar una visita demostrativa y una sesión grupal por solicitudes calificadas, sin contabilizar contactos como ventas.",
                [
                    "Preparar guion de demostración en finca",
                    "Diseñar hoja de registro de interesados",
                    "Realizar sesión demostrativa con seis productores",
                    "Comparar costo y calidad de contactos de ambos canales",
                ],
                "La captación depende de referencias personales. Todavía no existe un proceso para convertir interés en una instalación programada.",
            ),
            (
                "Validar lecturas y recomendaciones en ocho parcelas",
                "Error de lectura documentado, disponibilidad semanal y bitácora de consumo; no inferir ahorro con una semana de datos.",
                [
                    "Calibrar tres sensores por tipo de suelo",
                    "Instalar estaciones y registrar línea base",
                    "Ejecutar prueba de seis semanas y registrar incidencias",
                    "Analizar consumo y publicar limitaciones del piloto",
                ],
                "El prototipo transmite datos de laboratorio. No se ha evaluado exposición al agua, deriva del sensor ni comportamiento de batería en campo.",
            ),
            (
                "Preparar la ruta de formalización del equipo",
                "Lista de decisiones pendientes sobre sociedad, propiedad del firmware y contratos de prueba.",
                [
                    "Inventariar aportes y propiedad de componentes",
                    "Consultar requisitos de sociedad con asesoría externa",
                    "Redactar borrador de acuerdo de fundadores",
                    "Revisar contrato de préstamo de equipos del piloto",
                ],
                "El firmware está en cuentas personales. La sociedad no está constituida y el reparto de propiedad sigue pendiente.",
            ),
        ],
    },
    {
        "key": "circular",
        "name": "Circular Café · Materiales de segunda vida",
        "team": [
            "Lucía Brenes — materiales",
            "Esteban Quesada — producción",
            "Natalia Vega — diseño",
        ],
        "context": "Desarrollo de bandejas para viveros a partir de borra de café y aglutinante vegetal en el Valle Central. El caso ficticio compara resistencia, humedad y costo de producción; no declara biodegradabilidad certificada.",
        "ambitions": [
            (
                "Transformar residuos de café en productos útiles",
                "Validar una bandeja de doce cavidades que conserve su forma durante cuatro semanas de uso en vivero, con trazabilidad del residuo.",
            ),
            (
                "Conseguir una producción pequeña económicamente viable",
                "Contrastar lotes de 100 unidades a ₡1.450 por bandeja, incorporando secado, merma y logística.",
            ),
            (
                "Establecer una cadena de suministro consistente",
                "Documentar humedad de entrada y recolección semanal para reducir variabilidad entre lotes.",
            ),
            (
                "Investigar otras aplicaciones del material",
                "Aspiración sin comprometer recursos aún: estudiar protectores de empaque después de validar las bandejas.",
            ),
        ],
        "streams": [
            (
                "Delimitar el producto y sus afirmaciones ambientales",
                "Ficha de producto que diferencie aprovechamiento de residuo, compostabilidad y resultados aún no certificados.",
                [
                    "Acordar propósito y alcance del primer producto",
                    "Inventariar afirmaciones ambientales por verificar",
                    "Redactar ficha de valor para viveros",
                    "Revisar mensaje con asesoría de materiales",
                ],
                "Se confunden material de origen vegetal y biodegradabilidad. El discurso comercial debe limitarse a propiedades que el piloto pueda respaldar.",
            ),
            (
                "Medir el costo real por bandeja de doce cavidades",
                "Costo por lote con energía de secado, horas de moldeo y merma separados.",
                [
                    "Medir rendimiento de diez kilos de borra húmeda",
                    "Registrar tiempo y energía de secado",
                    "Calcular costo de lote de 100 bandejas",
                    "Contrastar precio y pedido mínimo con viveros",
                ],
                "El cálculo inicial trata el residuo como costo cero y omite transporte. La merma todavía se registra de forma informal.",
            ),
            (
                "Seleccionar viveros con necesidades compatibles",
                "Seis entrevistas y tres escenarios de uso que no requieran resistencia indefinida a inmersión.",
                [
                    "Segmentar viveros por cultivo y duración de almácigo",
                    "Entrevistar seis administradores de vivero",
                    "Observar apilamiento y manejo de bandejas",
                    "Priorizar tres escenarios para pruebas",
                ],
                "Hay interés por sustituir plástico, pero no se ha documentado la duración de cada almácigo ni las condiciones de apilamiento.",
            ),
            (
                "Validar venta directa mediante muestras trazables",
                "Cada muestra asociada a un lote y a un formulario de devolución, sin presentar intención de compra como pedido firme.",
                [
                    "Diseñar ficha de muestra con código de lote",
                    "Preparar catálogo breve para viveros",
                    "Entregar muestras a tres viveros ficticios",
                    "Recoger devoluciones y registrar intención de recompra",
                ],
                "Las muestras se entregan sin identificar formulación o lote. No puede compararse una devolución con la mezcla que la originó.",
            ),
            (
                "Comparar tres formulaciones bajo humedad de vivero",
                "Tres formulaciones evaluadas por deformación, masa y resistencia durante 28 días.",
                [
                    "Producir lotes A, B y C con proporciones controladas",
                    "Medir resistencia seca y absorción inicial",
                    "Registrar deformación semanal en uso simulado",
                    "Seleccionar formulación y documentar fallos",
                ],
                "El material mantiene forma en seco. Se desconoce su resistencia después de riego diario y el efecto del crecimiento de raíces.",
            ),
            (
                "Ordenar acuerdos de suministro y propiedad de fórmula",
                "Borradores de acuerdos con criterios de calidad del residuo y titularidad de la formulación.",
                [
                    "Mapear responsabilidad por recolección del residuo",
                    "Definir criterios de humedad y contaminantes",
                    "Redactar acuerdo de equipo sobre fórmula y moldes",
                    "Consultar requisitos para formalizar la sociedad",
                ],
                "La recolección se coordina verbalmente. La fórmula y los moldes no tienen acuerdos de titularidad documentados.",
            ),
        ],
    },
    {
        "key": "ruta",
        "name": "Ruta Clara · Logística para comercio local",
        "team": [
            "Sofía Campos — producto",
            "Mateo Rojas — software",
            "Daniela Leiva — investigación",
        ],
        "context": "Aplicación para consolidar entregas de comercios de barrio en Heredia. El piloto ficticio involucra seis comercios y dos repartidores, con asignación manual y sin prometer optimización automática ni integraciones bancarias.",
        "ambitions": [
            (
                "Hacer predecibles las entregas del comercio local",
                "Probar ventanas de entrega de dos horas y reducir llamadas para consultar estado, midiendo una línea base por comercio.",
            ),
            (
                "Validar un servicio por comercio y por entrega",
                "Contrastar suscripción de ₡25.000 más ₡800 por entrega con comercios que realizan entre 40 y 100 envíos mensuales.",
            ),
            (
                "Operar con información mínima y trazable",
                "Usar solo datos necesarios para la entrega, con permisos por rol y política de retención propuesta.",
            ),
            (
                "Explorar expansión a otras ciudades",
                "Aspiración para una fase posterior; no implica abrir cobertura antes de estabilizar Heredia.",
            ),
        ],
        "streams": [
            (
                "Definir el alcance del servicio y promesa de entrega",
                "Documento de servicio que delimite cobertura, ventanas horarias y responsabilidad por incidencias.",
                [
                    "Mapear responsabilidades de comercio y repartidor",
                    "Redactar promesa de entrega medible",
                    "Definir exclusiones del primer piloto",
                    "Revisar alcance con los seis comercios",
                ],
                "El equipo no ha delimitado cuándo una entrega se considera fallida ni quién informa al comprador. La promesa actual es demasiado general.",
            ),
            (
                "Validar el precio con volumen y soporte reales",
                "Tres escenarios de 40, 70 y 100 entregas, incluyendo soporte e incidencias.",
                [
                    "Medir tiempo administrativo por comercio",
                    "Modelar costo de soporte e incidencias",
                    "Contrastar esquema de suscripción y variable",
                    "Ajustar sensibilidad con dos repartidores",
                ],
                "El precio preliminar se basa en comparables informales. No incluye tiempo de soporte ni entregas que requieren una segunda visita.",
            ),
            (
                "Priorizar comercios con entregas recurrentes",
                "Seis perfiles y un mapa de problemas repetidos por tipo de pedido.",
                [
                    "Seleccionar comercios con al menos 40 envíos mensuales",
                    "Entrevistar responsables de despacho",
                    "Observar preparación de pedidos en dos jornadas",
                    "Definir criterios para excluir pedidos especiales",
                ],
                "Los contactos abarcan comercios muy distintos. Falta priorizar negocios con preparación y cobertura compatibles.",
            ),
            (
                "Medir captación por demostración y recomendación",
                "Embudo con demostraciones, pilotos aceptados y comercios activos separados.",
                [
                    "Preparar demostración de un pedido completo",
                    "Crear guion de incorporación para comercios",
                    "Probar una sesión grupal de demostración",
                    "Medir conversión y tiempo de incorporación",
                ],
                "Hay contactos por recomendaciones, sin registro del paso de interés a incorporación. No se distingue una cuenta creada de un comercio activo.",
            ),
            (
                "Probar trazabilidad de pedido de extremo a extremo",
                "Registro de creación, asignación, entrega e incidencia para 60 pedidos simulados.",
                [
                    "Implementar pedido con campos mínimos",
                    "Probar permisos de comercio y repartidor",
                    "Ejecutar 60 pedidos en rutas simuladas",
                    "Analizar incidencias y corregir estados ambiguos",
                ],
                "El flujo funciona con un usuario de prueba. Faltan controles de acceso entre comercios y manejo de pérdida de conexión en reparto.",
            ),
            (
                "Preparar acuerdos de servicio y protección de datos",
                "Borradores de servicio, retención de datos y acuerdos del equipo revisables por asesoría.",
                [
                    "Inventariar datos personales realmente necesarios",
                    "Definir responsabilidades sobre datos de entrega",
                    "Preparar borrador de acuerdo con repartidores",
                    "Consultar ruta de constitución de sociedad",
                ],
                "No existe política de retención. Los teléfonos del comprador no deberían quedar visibles a todos los repartidores.",
            ),
        ],
    },
    {
        "key": "aula",
        "name": "Aula Viva · Ciencias accesibles",
        "team": [
            "Mariana Acuña — pedagogía",
            "Andrés Vargas — diseño industrial",
            "Elena Chaves — accesibilidad",
        ],
        "context": "Kit reutilizable de experiencias de ciencias con guías táctiles y visuales para aulas de primaria de Alajuela. Las pruebas ficticias son con docentes y uso simulado; no incluyen datos personales de menores ni afirmaciones de mejora de aprendizaje.",
        "ambitions": [
            (
                "Facilitar experiencias de ciencias inclusivas",
                "Validar tres experiencias de 35 minutos que puedan prepararse en diez minutos y ofrezcan alternativas visuales y táctiles.",
            ),
            (
                "Ofrecer un kit durable y accesible para centros educativos",
                "Contrastar un precio de ₡65.000 por kit de seis equipos, con piezas de reposición y guías imprimibles.",
            ),
            (
                "Dar soporte docente sin depender del equipo fundador",
                "Documentar preparación, limpieza y reposición para que un docente pueda usar el kit sin asistencia presencial.",
            ),
            (
                "Construir un catálogo de experiencias adicionales",
                "Aspiración no comprometida: ampliar el catálogo solo después de verificar seguridad y utilidad del kit inicial.",
            ),
        ],
        "streams": [
            (
                "Definir propósito educativo y límites de la propuesta",
                "Marco de uso que no prometa resultados de aprendizaje sin una evaluación específica.",
                [
                    "Acordar propósito con el equipo pedagógico",
                    "Seleccionar tres experiencias del kit inicial",
                    "Definir límites de edad, uso y supervisión",
                    "Contrastar propuesta con cuatro docentes",
                ],
                "El equipo tiene muchas experiencias posibles, pero no ha definido un kit inicial ni criterios de accesibilidad verificables.",
            ),
            (
                "Medir costo del kit y piezas de reposición",
                "Desglose de seis equipos por kit, empaque, guías y reposición para tres escenarios de fabricación.",
                [
                    "Inventariar piezas por experiencia",
                    "Cotizar fabricación de 10 y 30 kits",
                    "Calcular costo de empaque y repuestos",
                    "Contrastar precio de ₡65.000 con docentes",
                ],
                "El costo inicial omite piezas perdidas y tiempo de preparación. No se ha separado el precio del kit del material consumible.",
            ),
            (
                "Priorizar docentes de primaria con recursos limitados",
                "Ocho entrevistas de necesidades y cuatro sesiones de uso simulado sin datos de estudiantes.",
                [
                    "Definir perfil docente y contexto del aula",
                    "Entrevistar ocho docentes sobre preparación",
                    "Observar montaje de experiencias con docentes",
                    "Sintetizar barreras de acceso y almacenamiento",
                ],
                "La necesidad se describe como falta de materiales, pero también hay limitaciones de tiempo de preparación y espacio de almacenamiento.",
            ),
            (
                "Probar demostraciones y una guía descargable",
                "Medir solicitudes de demostración y consultas calificadas, sin confundir descarga con compra.",
                [
                    "Diseñar una guía breve de una experiencia",
                    "Preparar demostración de 20 minutos para docentes",
                    "Realizar cuatro demostraciones simuladas",
                    "Registrar dudas y solicitudes de presupuesto",
                ],
                "La presentación muestra piezas, pero no demuestra qué hace el docente en cada momento. Falta un material que explique preparación y limpieza.",
            ),
            (
                "Validar preparación, accesibilidad y seguridad del kit",
                "Cuatro docentes prueban montaje; registrar tiempo, piezas ambiguas y barreras táctiles sin evaluar alumnos.",
                [
                    "Construir kit v0.3 con piezas numeradas",
                    "Revisar riesgos y materiales de cada experiencia",
                    "Probar montaje con cuatro docentes",
                    "Ajustar guías visuales y táctiles del kit",
                ],
                "El kit es funcional en manos del equipo fundador. No se han probado instrucciones con docentes nuevos ni contraste y legibilidad de las guías.",
            ),
            (
                "Preparar acuerdos de autoría y fabricación",
                "Borradores sobre derechos de guías, moldes y fabricación, con requisitos de sociedad pendientes.",
                [
                    "Inventariar autoría de guías y diseños",
                    "Acordar condiciones de licencia de las guías",
                    "Preparar acuerdo de fabricación de lotes pequeños",
                    "Consultar requisitos de constitución de sociedad",
                ],
                "Las guías están en carpetas individuales. No existe acuerdo sobre licencia, reutilización ni propiedad de los moldes.",
            ),
        ],
    },
]


def stable_id(key: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"{BATCH}/{key}"))


def ensure_target(environment: str, database_url: str, origin: str) -> None:
    url = make_url(database_url)
    if (
        environment != "staging"
        or origin != ORIGIN
        or url.get_backend_name() != "postgresql"
        or url.host != HOST
        or url.database != DATABASE
    ):
        raise ValueError("Seed bloqueado: exige sia.dev y el PostgreSQL exacto de staging")


async def add(db: AsyncSession, model: type[Base], key: str, **values: Any) -> Any:
    identifier = stable_id(key)
    existing = await db.get(model, identifier)
    if existing is not None:
        return existing  # Never overwrite edits made through the application.
    item = model(id=identifier, **values)
    db.add(item)
    await db.flush()
    return item


def at(day: date) -> datetime:
    return datetime.combine(day, datetime.min.time(), tzinfo=UTC) + timedelta(hours=15)


def activity_dates(project_key: str, stream: int, task: int) -> tuple[date, date]:
    start = date(2026, 8, 3) + timedelta(days=stream * 5 + task * 18)
    duration = 10
    trial_days = {"bruma": 42, "circular": 28}.get(project_key)
    if stream == 4 and trial_days is not None:
        trial_start = date(2026, 8, 3) + timedelta(days=stream * 5 + 36)
        if task == 2:
            duration = trial_days
        elif task == 3:
            start = trial_start + timedelta(days=trial_days + 1)
    return start, start + timedelta(days=duration)


async def repair_demo_dates(db: AsyncSession, actor: User) -> int:
    """Explicit repair of untouched v1 demo rows only; never overwrites user edits."""
    from app.modules.seguimiento.service import reopen, snapshot

    changed = 0
    for key in ["bruma", "circular"]:
        for task in [2, 3]:
            activity = await db.get(Activity, stable_id(f"{key}/activity/4/{task}"))
            if activity is None:
                continue
            start, end = activity_dates(key, 4, task)
            if (activity.starts_on, activity.ends_on) == (start, end):
                continue
            old_start = date(2026, 8, 3) + timedelta(days=20 + task * 18)
            if (
                activity.revision != 1
                or activity.completed_at is not None
                or (activity.starts_on, activity.ends_on)
                != (old_start, old_start + timedelta(days=10))
            ):
                raise ValueError("Actividad demo modificada por usuario: corrección bloqueada")
            before = snapshot(activity)
            activity.starts_on, activity.ends_on = start, end
            activity.revision += 1
            objective = await db.get(Objective, activity.objective_id)
            if objective is None:
                raise ValueError("Falta objetivo del ensayo")
            await reopen(db, actor, objective)
            await db.flush()
            await write_audit(
                db,
                actor.id,
                "staging.demo_dates",
                "Activity",
                activity.id,
                before,
                snapshot(activity),
            )
            changed += 1
    return changed


async def populate(db: AsyncSession, actor: User, readers: list[User]) -> dict[str, Any]:
    """Additive atomic batch. Caller owns transaction and staging verification."""
    if actor.role != "Coordinadora":
        raise ValueError("El operador existente debe ser Coordinadora; no se elevan roles")
    if not readers or any(u.role not in {"Gestor", "Emprendedor"} for u in readers):
        raise ValueError("Indica usuarios existentes Gestor/Emprendedor para los datos demo")
    responsible = next((u for u in readers if u.role == "Emprendedor"), readers[0])
    canvas = await db.scalar(
        select(ProgramCanvas).where(
            ProgramCanvas.program == "Prototipado", ProgramCanvas.version == 1
        )
    )
    if canvas is None:
        raise ValueError("Falta canvas oficial v1: no se crean definiciones ni se migran tablas")
    areas = list(
        await db.scalars(
            select(CanvasArea)
            .where(CanvasArea.canvas_id == canvas.id)
            .order_by(CanvasArea.position)
        )
    )
    if len(areas) != 6:
        raise ValueError("El canvas debe conservar las seis áreas oficiales")
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        await db.execute(text("SELECT pg_advisory_xact_lock(734028109)"))
    results = []
    for project in PROJECTS:
        key = project["key"]
        created = at(date(2026, 7, 6))
        ent = await add(
            db,
            Entrepreneurship,
            f"{key}/project",
            name=f"{project['name']} [DEMO]",
            created_at=created,
            updated_at=created,
        )
        for reader in readers:
            active = await db.scalar(
                select(EntrepreneurshipAssignment).where(
                    EntrepreneurshipAssignment.entrepreneurship_id == ent.id,
                    EntrepreneurshipAssignment.user_id == reader.id,
                    EntrepreneurshipAssignment.role == reader.role,
                    EntrepreneurshipAssignment.revoked_at.is_(None),
                )
            )
            if active is None:
                identifier = stable_id(f"{key}/assignment/{reader.id}")
                previous = await db.get(EntrepreneurshipAssignment, identifier)
                if previous is not None:
                    raise ValueError(
                        "La asignación demo fue revocada: no se reactiva silenciosamente"
                    )
                await add(
                    db,
                    EntrepreneurshipAssignment,
                    f"{key}/assignment/{reader.id}",
                    entrepreneurship_id=ent.id,
                    user_id=reader.id,
                    role=reader.role,
                    created_at=created,
                )
        enrollment = await add(
            db,
            ProgramEnrollment,
            f"{key}/enrollment",
            entrepreneurship_id=ent.id,
            program="Prototipado",
            enrolled_at=created,
        )
        cycle = await add(
            db,
            ProgramCycle,
            f"{key}/cycle",
            enrollment_id=enrollment.id,
            name="Piloto de validación · Julio–noviembre 2026 [DEMO]",
            created_at=created,
        )
        if await db.get(CycleCanvas, cycle.id) is None:
            db.add(CycleCanvas(cycle_id=cycle.id, canvas_id=canvas.id, entrepreneurship_id=ent.id))
            await db.flush()
        route = f"{ORIGIN}/expediente/{ent.id}/inscripciones/{enrollment.id}/ciclos/{cycle.id}"
        ambitions = []
        for index, (title, description) in enumerate(project["ambitions"]):
            ambitions.append(
                await add(
                    db,
                    Ambition,
                    f"{key}/ambition/{index}",
                    entrepreneurship_id=ent.id,
                    title=title,
                    description=f"{NOTICE}\n\n{project['context']}\n\n{description}",
                    created_at=created,
                )
            )
        for index, (title, target, tasks, initial) in enumerate(project["streams"]):
            objective = await add(
                db,
                Objective,
                f"{key}/objective/{index}",
                cycle_id=cycle.id,
                canvas_id=canvas.id,
                entrepreneurship_id=ent.id,
                area_id=areas[index].id,
                ambition_id=ambitions[[0, 1, 0, 1, 0, 2][index]].id,
                title=title,
                description=f"{NOTICE}\n\nContexto: {project['context']}\n\nPunto de partida: {initial}\n\nResultado esperado: {target}\n\nCriterio de revisión: presentar bitácora, método y limitaciones. Pendiente de validación humana; no constituye aprobación del programa.",
                deliverable=f"Documento de trabajo: {areas[index].name}",
                status="pending_validation" if index % 2 == 0 else "draft",
                created_at=created,
            )
            for task_index, task in enumerate(tasks):
                start, end = activity_dates(key, index, task_index)
                completed = task_index < (1 + index % 2) and end <= ANCHOR
                activity = await add(
                    db,
                    Activity,
                    f"{key}/activity/{index}/{task_index}",
                    cycle_id=cycle.id,
                    objective_id=objective.id,
                    responsible_id=responsible.id,
                    title=task,
                    description=f"{NOTICE}\n\nTrabajo: {task}.\n\nObjetivo: {title}.\n\nMétodo: registrar decisiones, fecha, observaciones y limitaciones en la bitácora del piloto. Equipo ficticio: {project['team'][task_index % 3]}.\n\nSalida esperada: {target}\n\n{'Ejecución simulada completada; pendiente de revisión.' if completed else 'Actividad planificada; no se presenta como resultado conseguido.'}",
                    starts_on=start,
                    ends_on=end,
                    completed_at=at(end) if completed else None,
                    created_at=at(start),
                )
                if completed:
                    await add(
                        db,
                        Evidence,
                        f"{key}/evidence/{index}/{task_index}",
                        cycle_id=cycle.id,
                        activity_id=activity.id,
                        title=f"Bitácora demo · {task}",
                        kind="link",
                        url=f"{route}#Reuniones",
                        description=f"{NOTICE}\n\nReferencia interna al expediente demo, no a un archivo externo ni a una certificación.\n\nActividad simulada: {task}.\n\nRegistro: se realizó la exploración prevista y se identificó la siguiente limitación: {initial}\n\nPróximo paso: {tasks[min(task_index + 1, 3)]}.\n\nLa revisión deberá comprobar: {target}",
                        created_by=actor.id,
                        created_at=at(end),
                    )
        for moment, day in enumerate([date(2026, 7, 10), date(2026, 8, 28), date(2026, 10, 5)]):
            observations = []
            for index, (_, target, tasks, initial) in enumerate(project["streams"]):
                evolution = [
                    f"Línea base: {initial} Prioridad acordada para el caso demo: {tasks[0]}.",
                    f"Seguimiento simulado: se documentó {tasks[0].lower()}. Aprendizaje: {initial} Aún falta {tasks[2].lower()}.",
                    f"Corte actual simulado: hay registros de las primeras actividades, pero no evidencia suficiente para cerrar el área. Siguiente paso: {tasks[3]}. Resultado a comprobar: {target}",
                ][moment]
                observations.append(
                    {"area_id": areas[index].id, "observation": f"{NOTICE}\n\n{evolution}"}
                )
            await add(
                db,
                Diagnostic,
                f"{key}/diagnostic/{moment}",
                cycle_id=cycle.id,
                canvas_id=canvas.id,
                entrepreneurship_id=ent.id,
                assessed_on=day,
                assessments=observations,
                supersedes_id=stable_id(f"{key}/diagnostic/{moment - 1}") if moment else None,
                status="draft",
                created_by=actor.id,
                created_at=at(day),
            )
        for index, day in enumerate([date(2026, 8, 14), date(2026, 9, 11), date(2026, 10, 2)]):
            stream = project["streams"][index + 2]
            meeting = await add(
                db,
                Meeting,
                f"{key}/meeting/{index}",
                cycle_id=cycle.id,
                title=f"{['Inicio del piloto', 'Revisión de aprendizajes', 'Priorización del siguiente sprint'][index]} [DEMO]",
                scheduled_at=at(day),
                participants=project["team"] + ["Mentoría ficticia del programa"],
                reference_url=None,
                created_by=actor.id,
                created_at=at(day),
            )
            transcript = f"{NOTICE}\nEquipo ficticio: revisamos {stream[0].lower()}. Situación: {stream[3]} Proponemos {stream[2][2].lower()} y {stream[2][3].lower()}. Resultado a contrastar: {stream[1]}"
            await add(
                db,
                Minutes,
                f"{key}/minutes/{index}",
                meeting_id=meeting.id,
                content=f"{transcript}\n\nAcuerdos propuestos:\n1. {stream[2][2]}.\n2. {stream[2][3]}.\n\nRiesgo: decidir con una muestra pequeña o sin registrar limitaciones.\nRevisión humana pendiente; no publicada ni aprobada.",
                origin="ia_borrador",
                source_transcript=transcript,
                status="borrador",
                created_by=actor.id,
                created_at=at(day),
            )
            for agreement_index, task in enumerate(stream[2][2:]):
                await add(
                    db,
                    Agreement,
                    f"{key}/agreement/{index}/{agreement_index}",
                    meeting_id=meeting.id,
                    description=f"[DEMO · propuesta ficticia] {task}",
                    responsible_id=responsible.id,
                    due_date=day + timedelta(days=14 + agreement_index * 7),
                    next_steps=f"Recopilar registro para: {stream[1]} Incluir método, limitaciones y próxima decisión; pendiente de revisión humana.",
                    created_by=actor.id,
                    created_at=at(day),
                )
        for index, name in enumerate(
            ["Consultas técnicas", "Reuniones y acuerdos", "Costos y planificación"]
        ):
            channel = await add(
                db,
                Channel,
                f"{key}/channel/{index}",
                entrepreneurship_id=ent.id,
                cycle_id=cycle.id,
                name=f"{name} [DEMO]",
                created_by=actor.id,
                created_at=created,
            )
            stream = project["streams"][[4, 2, 1][index]]
            messages = [
                f"{NOTICE} Conversación sintética del equipo; no son mensajes enviados por estas personas.",
                f"Equipo ficticio: esta semana nos enfocaremos en {stream[0].lower()}. Queremos comprobar: {stream[1]}",
                f"Mentoría ficticia: antes de probar, registren la línea base. El riesgo actual es: {stream[3]}",
                f"Equipo ficticio: dejamos documentado el primer paso: {stream[2][0]}. Los resultados siguen siendo ejemplos de demostración.",
                f"Operaciones ficticias: para el siguiente sprint proponemos {stream[2][2].lower()}. Incluiremos incidencias y tiempo invertido.",
                "Mentoría ficticia: distingamos datos registrados, hipótesis y decisiones pendientes. No hay aprobación de entregables ni compras en esta conversación.",
            ]
            for message_index, content in enumerate(messages):
                await add(
                    db,
                    Message,
                    f"{key}/message/{index}/{message_index}",
                    channel_id=channel.id,
                    content=content,
                    created_by=actor.id,
                    created_at=at(date(2026, 9, 1) + timedelta(days=message_index * 5)),
                )
        for month in [8, 9]:
            report_key = f"{key}/report/{month}"
            if await db.get(TechnicalReport, stable_id(report_key)) is None:
                start, end = date(2026, month, 1), date(2026, month, 31 if month == 8 else 30)
                composition = await _compose(db, cycle.id, start, end)
                await add(
                    db,
                    TechnicalReport,
                    report_key,
                    entrepreneurship_id=ent.id,
                    cycle_id=cycle.id,
                    period_start=start,
                    period_end=end,
                    kind="mensual",
                    narrative=f"{NOTICE}\n\nBorrador generado exclusivamente desde las fuentes demo del período. Se registran {len(composition['activities_completed'])} actividades simuladas completadas, {len(composition['evidence'])} referencias internas y {len(composition['agreements'])} acuerdos propuestos. Los objetivos y las minutas no cuentan con aprobación humana. Finanzas: Pendiente de completar. No se infieren ventas, impacto ni criterios de salida.",
                    composition=composition,
                    status="borrador",
                    created_by=actor.id,
                    created_at=at(end),
                )
        results.append({"project": ent.name, "cycle_id": cycle.id, "url": route})
    marker = await db.execute(
        text("SELECT id FROM audit_logs WHERE action = :action AND entity_id = :batch"),
        {"action": "staging.demo_seed", "batch": BATCH},
    )
    if marker.first() is None:
        await write_audit(
            db,
            actor.id,
            "staging.demo_seed",
            "demo_batch",
            BATCH,
            None,
            {
                "notice": NOTICE,
                "projects": results,
                "reader_ids": [u.id for u in readers],
                "approval": "none",
                "operator": "manual staging seed",
            },
        )
    return {"batch": BATCH, "projects": results, "approvals_created": 0}


async def run(args: argparse.Namespace) -> None:
    ensure_target(settings.environment, settings.database_url, args.origin)
    async with async_session() as db, db.begin():
        actual = await db.scalar(text("SELECT current_database()"))
        if actual != DATABASE:
            raise ValueError("La base real no coincide con staging")
        actor = await db.scalar(select(User).where(User.email == args.operator_email))
        if actor is None:
            raise ValueError("El operador no existe; no se crean identidades")
        found = list(await db.scalars(select(User).where(User.email.in_(args.reader_email))))
        by_email = {u.email: u for u in found}
        if set(by_email) != set(args.reader_email):
            raise ValueError("Falta un usuario indicado; no se crean identidades")
        readers = [by_email[email] for email in dict.fromkeys(args.reader_email)]
        if actor.role != "Coordinadora" or any(
            u.role not in {"Gestor", "Emprendedor"} for u in readers
        ):
            raise ValueError("Los roles existentes no coinciden con el operador y lectores")
        if args.apply:
            result = await populate(db, actor, readers)
            if args.repair_demo_dates:
                result["dates_repaired"] = await repair_demo_dates(db, actor)
        else:
            result = {
                "dry_run": True,
                "batch": BATCH,
                "projects": [p["name"] for p in PROJECTS],
                "reader_count": len(readers),
                "approvals_created": 0,
            }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga demo manual y exclusiva de sia.dev")
    parser.add_argument("--origin", required=True)
    parser.add_argument("--operator-email", required=True)
    parser.add_argument("--reader-email", action="append", required=True)
    parser.add_argument("--apply", action="store_true", help="Sin este argumento no escribe")
    parser.add_argument(
        "--repair-demo-dates",
        action="store_true",
        help="Corregir solo fechas intactas de los ensayos demo v1",
    )
    args = parser.parse_args()
    try:
        asyncio.run(run(args))
    except Exception:
        # SQLAlchemy exceptions can include credentials/SQL payloads; fail without leaking them.
        parser.exit(
            2,
            "Carga cancelada y transacción revertida. Revisar destino, usuarios y esquema; no se imprimen credenciales.\n",
        )


if __name__ == "__main__":
    main()
