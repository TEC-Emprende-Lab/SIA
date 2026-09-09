import type { Area, Diagnostic, Store } from './types'

export const TODAY = '2026-09-07'
export const project = { id: 'lumen', name: 'Lumen Biotech', model: 'Prototipado', sector: 'Salud y biotecnología', description: 'Diagnóstico accesible para una atención más oportuna. Desarrollamos un dispositivo de detección temprana para clínicas de atención primaria en Costa Rica.', start: '2026-03-02', end: '2026-12-18', budget: 5000000 }
export const people = ['María Calderón', 'Javier Soto', 'Andrea Morales', 'Carlos Rojas']
export const areas: Area[] = [
  { id: 'identity', name: 'Identidad y dirección estratégica', short: 'Identidad estratégica', question: '¿Los estatutos, la misión y la visión orientan al emprendimiento?', color: 'olive', icon: 'Lightbulb' },
  { id: 'business-model', name: 'Modelo de negocio', short: 'Modelo de negocio', question: '¿El modelo explica cómo se crea, entrega y captura valor?', color: 'sand', icon: 'Wallet' },
  { id: 'segmented-market', name: 'Mercado segmentado', short: 'Mercado segmentado', question: '¿Están definidos y priorizados los segmentos de mercado?', color: 'blue', icon: 'Users' },
  { id: 'channels', name: 'Canales definidos', short: 'Canales', question: '¿Están definidos los canales para llegar a clientes y aliados?', color: 'clay', icon: 'Megaphone' },
  { id: 'mvp', name: 'Producto mínimo viable', short: 'MVP', question: '¿El MVP permite validar la solución con usuarios reales?', color: 'orange', icon: 'Box' },
  { id: 'incorporation', name: 'Constitución de sociedad', short: 'Constitución', question: '¿La sociedad está formalizada para avanzar a la siguiente etapa?', color: 'blue', icon: 'Sprout' },
]
const observations = [
  'Misión y visión contrastadas con el equipo; los estatutos requieren revisión final.',
  'Modelo inicial documentado; se ajusta la hipótesis de ingresos.',
  'Se identificaron tres segmentos de clínicas; la disposición de pago todavía requiere validación.',
  'Existe material de presentación, pero falta validar los canales de contacto.',
  'MVP funcional evaluado en cinco sesiones; falta consolidar hallazgos de usabilidad.',
  'La constitución de sociedad está en preparación con acompañamiento especializado.',
]
function diagnostic(id: string, date: string, scores: number[], type: Diagnostic['type']): Diagnostic {
  return { id, projectId: project.id, date, type, author: 'Javier Soto', status: 'APPROVED', approvedBy: 'María Calderón', approvedAt: date, observation: type === 'INITIAL' ? 'Línea base al inicio del acompañamiento. Priorizar el MVP, el mercado y la formalización.' : 'El equipo avanza en la validación del MVP y su preparación comercial. El modelo y la constitución requieren atención.', assessments: areas.map((a, i) => ({ areaId: a.id, name: a.name, question: a.question, score: scores[i], observation: type === 'INITIAL' ? ['Misión y visión en formulación; estatutos por definir.', 'Hipótesis de ingresos por contrastar.', 'Segmentos identificados de forma preliminar.', 'Canales de contacto sin validar.', 'Primera versión de laboratorio sin prueba con usuarios.', 'Constitución de sociedad por iniciar.'][i] : id === 'd2' ? ['Misión y visión revisadas con el equipo; estatutos en preparación.', 'Modelo base y proyección inicial registrados.', 'Segmentos de clínicas identificados; entrevistas pendientes.', 'Presentación comercial inicial; canales por validar.', 'MVP funcional; se prepara el protocolo para sesiones con usuarios.', 'Ruta de constitución en exploración.'][i] : observations[i] })) }
}
export function createSeed(): Store {
  return {
    diagnostics: [diagnostic('d1', '2026-03-06', [2, 2, 2, 2, 2, 1], 'INITIAL'), diagnostic('d2', '2026-06-05', [3, 3, 2, 2, 3, 2], 'FOLLOW_UP'), diagnostic('d3', '2026-09-04', [4, 3, 3, 2, 4, 3], 'FOLLOW_UP')],
    ambitions: [
      { id: 'am1', projectId: 'lumen', type: 'VISION', title: 'Acercar el diagnóstico temprano a cada comunidad', description: 'Ser una opción accesible y confiable para las clínicas de atención primaria en Costa Rica.', category: 'Acceso a salud', owner: 'Andrea Morales', start: '', due: '', measurement: '', verification: '' },
      { id: 'am2', projectId: 'lumen', type: 'AMBITION', title: 'Validar la prueba piloto con usuarios', description: 'Convertir la retroalimentación del personal clínico en mejoras verificables del prototipo.', category: 'Validación', owner: 'Andrea Morales', start: '', due: '2026-09-30', measurement: '', verification: '' },
      { id: 'am3', projectId: 'lumen', type: 'MILESTONE', title: 'Contar con una ruta regulatoria revisada', description: 'Revisar el expediente con acompañamiento especializado antes de su presentación.', category: 'Formalización', owner: 'Javier Soto', start: '', due: '2026-10-15', measurement: '', verification: 'Matriz regulatoria revisada y minuta de validación.' },
    ],
    objectives: [
      { id: 'o1', projectId: 'lumen', areaId: 'mvp', ambitionId: 'am2', title: 'Validar la prueba piloto con usuarios', description: 'Realizar cinco sesiones y documentar oportunidades de mejora del dispositivo.', status: 'APPROVED', date: '2026-03-10', approvedBy: 'Javier Soto', approvedAt: '2026-03-12' },
      { id: 'o2', projectId: 'lumen', areaId: 'incorporation', ambitionId: 'am3', title: 'Preparar la constitución de la sociedad', description: 'Mapear requisitos y construir la documentación para revisión especializada.', status: 'APPROVED', date: '2026-06-10', approvedBy: 'Javier Soto', approvedAt: '2026-06-12' },
      { id: 'o3', projectId: 'lumen', areaId: 'business-model', ambitionId: 'am1', title: 'Validar el modelo de ingresos con clínicas', description: 'Contrastar hipótesis de precio con tomadores de decisión.', status: 'PENDING_APPROVAL', date: '2026-09-05' },
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
    reports: [], audit: [{ id: 'log1', entityId: 'd3', action: 'Diagnóstico de seguimiento aprobado', actor: 'María Calderón', date: '2026-09-04' }, { id: 'log2', entityId: 'o3', action: 'Objetivo vinculado a la ambición am1', actor: 'Javier Soto', date: '2026-09-05' }],
    messages: [{ id: 'msg1', author: 'Andrea Morales', content: 'Ya está disponible la bitácora de las cinco sesiones piloto en Evidencias.', date: '2026-09-04' }, { id: 'msg2', author: 'Javier Soto', content: 'Gracias, Andrea. En la próxima reunión revisamos los hallazgos y la proyección de caja.', date: '2026-09-04' }],
  }
}
export const procedures = [
  { id: 'tr1', title: 'Materiales de prototipo', amount: 185000, status: 'APPROVED', date: '2026-08-10', supplier: 'Suministros de Laboratorio CR', type: 'Orden de compra' },
  { id: 'tr2', title: 'Compra de reactivos', amount: 420000, status: 'IN_SIGNATURE_PROCESS', date: '2026-09-01', supplier: 'Bioinsumos Costa Rica', type: 'Orden de compra' },
  { id: 'tr3', title: 'Servicio de laboratorio', amount: 275000, status: 'UNDER_REVIEW', date: '2026-09-03', supplier: 'Laboratorio Central', type: 'Pago de contrato' },
]
