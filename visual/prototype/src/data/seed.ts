import type { Area, Diagnostic, Store } from './types'

export const TODAY = '2026-09-07'
export const project = { id: 'lumen', name: 'Lumen Biotech', model: 'Prototipado', sector: 'Salud y biotecnología', description: 'Diagnóstico accesible para una atención más oportuna. Desarrollamos un dispositivo de detección temprana para clínicas de atención primaria en Costa Rica.', start: '2026-03-02', end: '2026-12-18', budget: 5000000 }
export const people = ['María Calderón', 'Javier Soto', 'Andrea Morales', 'Carlos Rojas']
export const areas: Area[] = [
  { id: 'business', name: 'Modelo de negocio y propuesta de valor', short: 'Modelo de negocio', question: '¿Qué problema resuelve y qué hace sostenible la propuesta de valor?', color: 'olive', icon: 'Lightbulb' },
  { id: 'product', name: 'Producto o prototipo', short: 'Producto o prototipo', question: '¿Qué tan validado está el producto con usuarios reales?', color: 'orange', icon: 'Box' },
  { id: 'market', name: 'Clientes y mercado', short: 'Clientes y mercado', question: '¿Conocemos a nuestros clientes y sus necesidades?', color: 'blue', icon: 'Users' },
  { id: 'sales', name: 'Marketing y ventas', short: 'Marketing y ventas', question: '¿Cómo llegamos al mercado y convertimos interés en ventas?', color: 'clay', icon: 'Megaphone' },
  { id: 'finance', name: 'Finanzas y financiamiento', short: 'Finanzas', question: '¿Contamos con una planificación financiera sostenible?', color: 'sand', icon: 'Wallet' },
  { id: 'team', name: 'Equipo y operaciones', short: 'Equipo y operaciones', question: '¿El equipo tiene los roles y procesos necesarios para ejecutar?', color: 'olive', icon: 'Workflow' },
  { id: 'legal', name: 'Legal y propiedad intelectual', short: 'Legal y propiedad intelectual', question: '¿Qué requisitos legales y de protección intelectual están cubiertos?', color: 'blue', icon: 'ShieldCheck' },
  { id: 'impact', name: 'Tecnología e impacto', short: 'Tecnología e impacto', question: '¿Cómo verificamos el desempeño tecnológico y su impacto?', color: 'clay', icon: 'Sprout' },
]
const observations = [
  'Propuesta de valor contrastada con personal de atención primaria. Se necesita ajustar el modelo de ingresos.',
  'Prototipo funcional evaluado en cinco sesiones. Falta consolidar los hallazgos de usabilidad.',
  'Se identificaron tres segmentos de clínicas; la disposición de pago todavía requiere validación.',
  'Existe material de presentación, pero falta un proceso comercial repetible.',
  'Presupuesto inicial disponible. Se requiere actualizar la proyección de flujo de caja.',
  'Roles técnicos definidos y reuniones de seguimiento registradas.',
  'Ruta regulatoria identificada. El expediente y la revisión de propiedad intelectual siguen pendientes.',
  'Indicadores técnicos definidos; no hay medición de impacto clínico a largo plazo.',
]
function diagnostic(id: string, date: string, scores: number[], type: Diagnostic['type']): Diagnostic {
  return { id, projectId: project.id, date, type, author: 'Javier Soto', status: 'APPROVED', approvedBy: 'María Calderón', approvedAt: date, observation: type === 'INITIAL' ? 'Línea base al inicio del acompañamiento. Priorizar validación del prototipo y del mercado.' : 'El equipo avanza en validación técnica y organización. El desarrollo comercial y el financiamiento requieren atención.', assessments: areas.map((a, i) => ({ areaId: a.id, name: a.name, question: a.question, score: scores[i], observation: type === 'INITIAL' ? ['Hipótesis de valor por contrastar.', 'Primera versión de laboratorio sin prueba con usuarios.', 'Segmentos identificados de forma preliminar.', 'Presentación comercial inicial.', 'Estimación inicial de costos y presupuesto.', 'Roles informales en el equipo.', 'Requisitos regulatorios por mapear.', 'Indicadores técnicos en definición.'][i] : id === 'd2' ? ['Propuesta de valor revisada con el equipo; pendiente contraste comercial.', 'Prototipo de laboratorio funcional. Se prepara el protocolo para sesiones con usuarios.', 'Segmentos preliminares de clínicas identificados; entrevistas pendientes.', 'Presentación comercial inicial; aún sin proceso de prospección.', 'Presupuesto base y proyección inicial registrados.', 'Roles técnicos definidos; falta formalizar la coordinación.', 'Ruta regulatoria en exploración; se planifica el mapeo de requisitos.', 'Indicadores técnicos propuestos; validación pendiente.'][i] : observations[i], notes: 'Evaluación documentada en la sesión de acompañamiento.', evidenceIds: id !== 'd3' ? [] : i === 1 ? ['e1', 'e2'] : i === 6 ? ['e3'] : [] })) }
}
export function createSeed(): Store {
  return {
    diagnostics: [diagnostic('d1', '2026-03-06', [2, 2, 2, 2, 3, 2, 1, 2], 'INITIAL'), diagnostic('d2', '2026-06-05', [3, 3, 2, 2, 3, 3, 2, 3], 'FOLLOW_UP'), diagnostic('d3', '2026-09-04', [4, 4, 3, 2, 2, 4, 3, 3], 'FOLLOW_UP')],
    needs: [
      { id: 'n1', projectId: 'lumen', diagnosticId: 'd1', areaId: 'product', title: 'Validar el prototipo en un entorno real', description: 'Contrastar la facilidad de uso del dispositivo con personal de atención primaria antes de ajustar el diseño.', priority: 'HIGH', status: 'PARTIALLY_ADDRESSED', owner: 'Andrea Morales', date: '2026-03-06', objectiveIds: ['o1'], activityIds: ['a1', 'a2', 'a3', 'a4'], evidenceIds: ['e1', 'e2'], meetingIds: ['m1'] },
      { id: 'n2', projectId: 'lumen', diagnosticId: 'd3', areaId: 'finance', title: 'Proyectar el flujo de caja para los próximos 12 meses', description: 'Actualizar costos de fabricación, necesidades de capital y escenarios de ingresos para la siguiente etapa.', priority: 'HIGH', status: 'IDENTIFIED', owner: 'Carlos Rojas', date: '2026-09-04', objectiveIds: [], activityIds: [], evidenceIds: [], meetingIds: ['m1'] },
      { id: 'n3', projectId: 'lumen', diagnosticId: 'd2', areaId: 'legal', title: 'Definir la ruta de cumplimiento regulatorio', description: 'Organizar requisitos y responsables del expediente sanitario del dispositivo.', priority: 'HIGH', status: 'IN_PLANNING', owner: 'Javier Soto', date: '2026-06-05', objectiveIds: ['o2'], activityIds: ['a5', 'a6'], evidenceIds: ['e3'], meetingIds: ['m1'] },
      { id: 'n4', projectId: 'lumen', diagnosticId: 'd3', areaId: 'market', title: 'Validar la disposición de pago de las clínicas', description: 'Entrevistar tomadores de decisión de los tres segmentos de clínicas identificados.', priority: 'MEDIUM', status: 'VALIDATED', owner: 'Andrea Morales', date: '2026-09-04', objectiveIds: ['o3'], activityIds: ['a7'], evidenceIds: [], meetingIds: [] },
      { id: 'n5', projectId: 'lumen', diagnosticId: 'd1', areaId: 'team', title: 'Definir responsabilidades del equipo', description: 'Acordar funciones técnicas y comerciales y una cadencia de coordinación.', priority: 'MEDIUM', status: 'ADDRESSED', owner: 'Carlos Rojas', date: '2026-03-06', objectiveIds: [], activityIds: [], evidenceIds: [], meetingIds: ['m1'], justification: 'El diagnóstico de septiembre confirma roles definidos y seguimiento regular.', resolvedAt: '2026-09-05', supportId: 'd3' },
      { id: 'n6', projectId: 'lumen', diagnosticId: 'd3', areaId: 'sales', title: 'Construir un proceso de prospección comercial', description: 'Definir responsables y pasos de contacto con clínicas de atención primaria.', priority: 'MEDIUM', status: 'IDENTIFIED', owner: 'Carlos Rojas', date: '2026-09-04', objectiveIds: [], activityIds: [], evidenceIds: [], meetingIds: [] },
    ],
    ambitions: [
      { id: 'am1', projectId: 'lumen', type: 'VISION', title: 'Acercar el diagnóstico temprano a cada comunidad', description: 'Ser una opción accesible y confiable para las clínicas de atención primaria en Costa Rica.', areaId: 'impact', category: 'Acceso a salud', owner: 'Andrea Morales', start: '', due: '', measurement: '', verification: '', needIds: ['n1', 'n4'], objectiveIds: ['o1', 'o3'] },
      { id: 'am2', projectId: 'lumen', type: 'OBJECTIVE', title: 'Validar la prueba piloto con usuarios', description: 'Convertir la retroalimentación del personal clínico en mejoras verificables del prototipo.', areaId: 'product', category: 'Validación', owner: 'Andrea Morales', start: '', due: '2026-09-30', measurement: 'Cinco sesiones piloto y un informe consolidado de hallazgos.', verification: '', needIds: ['n1'], objectiveIds: ['o1'] },
      { id: 'am3', projectId: 'lumen', type: 'MILESTONE', title: 'Contar con una ruta regulatoria revisada', description: 'Revisar el expediente con acompañamiento especializado antes de su presentación.', areaId: 'legal', category: 'Formalización', owner: 'Javier Soto', start: '', due: '2026-10-15', measurement: '', verification: 'Matriz regulatoria revisada y minuta de validación.', needIds: ['n3'], objectiveIds: ['o2'] },
    ],
    objectives: [
      { id: 'o1', projectId: 'lumen', title: 'Validar la prueba piloto con usuarios', description: 'Realizar cinco sesiones y documentar oportunidades de mejora del dispositivo.', status: 'APPROVED', date: '2026-03-10', approvedBy: 'Javier Soto', approvedAt: '2026-03-12' },
      { id: 'o2', projectId: 'lumen', title: 'Preparar la estrategia regulatoria', description: 'Mapear requisitos y construir la matriz de riesgos para revisión especializada.', status: 'APPROVED', date: '2026-06-10', approvedBy: 'Javier Soto', approvedAt: '2026-06-12' },
      { id: 'o3', projectId: 'lumen', title: 'Validar el modelo de ingresos con clínicas', description: 'Contrastar hipótesis de precio con tomadores de decisión.', status: 'PENDING_APPROVAL', date: '2026-09-05' },
    ],
    activities: [
      { id: 'a1', objectiveId: 'o1', title: 'Reclutar participantes de cinco clínicas', owner: 'Andrea Morales', date: '2026-08-18', status: 'DONE', autoComplete: false, completedAt: '2026-08-18' },
      { id: 'a2', objectiveId: 'o1', title: 'Realizar cinco sesiones piloto', owner: 'Andrea Morales', date: '2026-08-29', status: 'DONE', autoComplete: false, completedAt: '2026-08-29' },
      { id: 'a3', objectiveId: 'o1', title: 'Analizar los resultados de las sesiones', owner: 'Carlos Rojas', date: '2026-09-10', status: 'IN_PROGRESS', autoComplete: false },
      { id: 'a4', objectiveId: 'o1', title: 'Documentar los hallazgos del piloto', owner: 'Andrea Morales', date: '2026-09-18', status: 'TODO', autoComplete: false },
      { id: 'a5', objectiveId: 'o2', title: 'Mapear los requisitos regulatorios', owner: 'Javier Soto', date: '2026-08-28', status: 'DONE', autoComplete: false, completedAt: '2026-08-28' },
      { id: 'a6', objectiveId: 'o2', title: 'Preparar la matriz de riesgos', owner: 'Carlos Rojas', date: '2026-09-15', status: 'IN_REVIEW', autoComplete: false },
      { id: 'a7', objectiveId: 'o3', title: 'Diseñar el guion de entrevistas comerciales', owner: 'Andrea Morales', date: '2026-09-22', status: 'TODO', autoComplete: false },
    ],
    evidence: [
      { id: 'e1', activityId: 'a1', title: 'Registro de participantes del piloto', type: 'FILE', date: '2026-08-18', author: 'Andrea Morales', content: 'Registro ficticio: cinco clínicas de atención primaria confirmaron participación. Se asignaron códigos P01 a P05 para las sesiones de usabilidad.' },
      { id: 'e2', activityId: 'a2', title: 'Bitácora de las cinco sesiones piloto', type: 'FILE', date: '2026-08-29', author: 'Andrea Morales', content: 'Se realizaron cinco sesiones con personal de atención primaria. Se registraron observaciones sobre legibilidad, secuencia de uso y manejo del dispositivo. El análisis consolidado está pendiente. Estas sesiones no constituyen validación clínica ni acreditan impacto en salud.' },
      { id: 'e3', activityId: 'a5', title: 'Mapa preliminar de requisitos regulatorios', type: 'FILE', date: '2026-08-28', author: 'Javier Soto', content: 'Matriz de trabajo ficticia: requisitos documentales, responsables y consultas para asesoría especializada. No representa una aprobación sanitaria. Próximo paso: revisar riesgos y completar el expediente.' },
    ],
    meetings: [{ id: 'm1', projectId: 'lumen', title: 'Revisión de avance de agosto', date: '2026-08-31', time: '09:00–10:00', minutes: 'Andrea presentó la bitácora de cinco sesiones piloto. Javier compartió el mapa de requisitos regulatorios. El análisis de hallazgos sigue en curso.', agreements: 'Carlos consolida resultados el 10 de septiembre. Andrea documenta hallazgos el 18 de septiembre. Se revisará el flujo de caja en la próxima sesión.' }, { id: 'm2', projectId: 'lumen', title: 'Seguimiento mensual de septiembre', date: '2026-09-17', time: '09:00–10:00', minutes: '', agreements: '' }],
    reports: [], audit: [{ id: 'log1', entityId: 'd3', action: 'Diagnóstico de seguimiento aprobado', actor: 'María Calderón', date: '2026-09-04' }, { id: 'log2', entityId: 'n5', action: 'Necesidad atendida con respaldo del diagnóstico d3', actor: 'Javier Soto', date: '2026-09-05' }],
    messages: [{ id: 'msg1', author: 'Andrea Morales', content: 'Ya está disponible la bitácora de las cinco sesiones piloto en Evidencias.', date: '2026-09-04' }, { id: 'msg2', author: 'Javier Soto', content: 'Gracias, Andrea. En la próxima reunión revisamos los hallazgos y la proyección de caja.', date: '2026-09-04' }],
  }
}
export const procedures = [
  { id: 'tr1', title: 'Materiales de prototipo', amount: 185000, status: 'APPROVED', date: '2026-08-10', supplier: 'Suministros de Laboratorio CR', type: 'Orden de compra' },
  { id: 'tr2', title: 'Compra de reactivos', amount: 420000, status: 'IN_SIGNATURE_PROCESS', date: '2026-09-01', supplier: 'Bioinsumos Costa Rica', type: 'Orden de compra' },
  { id: 'tr3', title: 'Servicio de laboratorio', amount: 275000, status: 'UNDER_REVIEW', date: '2026-09-03', supplier: 'Laboratorio Central', type: 'Pago de contrato' },
]
