import { useState } from 'react'
import { ArrowRight, Check, Cloud, Eye, Flag, Heart, Link2, Mountain, Plus, Rocket, Target, Trophy } from 'lucide-react'
import type { Ambition, AmbitionType } from '../data/types'
import { people, project } from '../data/seed'
import { objectiveProgress, uid } from '../data/repository'
import { Badge, Button, Empty, Field, Heading, Modal, Progress, TextLink } from '../ui'
import { dateLabel, useData } from '../state'

const ambitionTypes = [
  { id: 'DREAM', title: 'Sueño', description: 'Lo que nos inspira, sin límites.', icon: Cloud },
  { id: 'VISION', title: 'Visión', description: 'El futuro que queremos construir.', icon: Eye },
  { id: 'PURPOSE', title: 'Propósito', description: 'La razón por la que existimos.', icon: Heart },
  { id: 'AMBITION', title: 'Ambición', description: 'Una aspiración que nos moviliza.', icon: Mountain },
  { id: 'OBJECTIVE', title: 'Objetivo', description: 'Un resultado que queremos alcanzar.', icon: Target },
  { id: 'GOAL', title: 'Meta', description: 'Un resultado concreto y medible.', icon: Trophy },
  { id: 'MILESTONE', title: 'Hito', description: 'Un logro que marca el camino.', icon: Flag },
  { id: 'PROJECT', title: 'Proyecto', description: 'Un conjunto de objetivos conectados.', icon: Rocket },
] as const

export function Ambitions({ focusId }: { focusId?: string }) {
  const { data, navigate } = useData()
  const [editor, setEditor] = useState<Ambition | 'new' | null>(null)
  const [detail, setDetail] = useState(focusId ?? '')
  const [typeFilter, setTypeFilter] = useState('all')
  const ambition = data.ambitions.find(a => a.id === detail)
  const visible = data.ambitions.filter(a => typeFilter === 'all' || a.type === typeFilter)
  const linkedObjectives = (id: string) => data.objectives.filter(o => o.ambitionId === id)
  return <><Heading eyebrow="La dirección que nos mueve" title="Ambiciones" description="Mantén visibles las aspiraciones del proyecto y vincúlalas al plan solo cuando aporte contexto." action={<Button onClick={() => setEditor('new')}><Plus size={17} /> Nueva ambición</Button>} />
    <div className="strategy-banner"><span className="strategy-art"><Mountain size={72} strokeWidth={.8} /></span><div><p className="eyebrow">De imaginar a hacer</p><h2>Grandes ideas. Pasos con sentido.</h2><p>Las ambiciones orientan; los objetivos y actividades convierten esa dirección en trabajo verificable.</p></div></div>
    <div className="filters"><h2>{data.ambitions.length} ambiciones</h2><select aria-label="Filtrar tipo de ambición" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="all">Todos los tipos</option>{ambitionTypes.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
    <div className="ambition-grid">{visible.map(a => { const type = ambitionTypes.find(t => t.id === a.type)!; const Icon = type.icon; const objectives = linkedObjectives(a.id); return <button className={`ambition-card type-${a.type}`} key={a.id} onClick={() => setDetail(a.id)}><div className="inline"><span className="area-icon"><Icon size={24} strokeWidth={1.5} /></span><span className="eyebrow">{type.title}</span></div><h2>{a.title}</h2><p>{a.description}</p><div className="ambition-links"><span><Target size={14} />{objectives.length} objetivos vinculados</span></div><footer><span>{a.owner || 'Sin responsable'}<small>{a.due ? dateLabel(a.due) : 'Sin plazo definido'}</small></span><ArrowRight size={18} /></footer></button> })}</div>
    {!visible.length && <Empty title="Aquí puede empezar una gran idea" text="Todavía no hay ambiciones de este tipo." action={<Button onClick={() => setEditor('new')}>Crear ambición</Button>} />}
    <div className="footnote"><Link2 size={15} />Una ambición puede existir sin objetivos; cada objetivo puede vincular una ambición de forma opcional.</div>
    {ambition && <Modal title={ambition.title} description={ambition.description} onClose={() => setDetail('')}><p className="eyebrow">{ambitionTypes.find(t => t.id === ambition.type)?.title}{ambition.category ? ` · ${ambition.category}` : ''}</p><div className="definition-grid"><div><span>Responsable</span><strong>{ambition.owner || 'Sin asignar'}</strong></div><div><span>Plazo</span><strong>{ambition.due ? dateLabel(ambition.due) : 'Sin plazo definido'}</strong></div>{ambition.measurement && <div><span>Medición</span><strong>{ambition.measurement}</strong></div>}{ambition.verification && <div><span>Verificación</span><strong>{ambition.verification}</strong></div>}</div><h3>Objetivos vinculados</h3>{linkedObjectives(ambition.id).length ? linkedObjectives(ambition.id).map(o => <div className="linked-objective" key={o.id}><TextLink onClick={() => navigate('Objetivos y actividades', o.id)}>{o.title}</TextLink><Badge status={o.status} /><Progress value={objectiveProgress(data, o.id)} /></div>) : <p className="muted">Aún no hay objetivos vinculados. Puedes hacerlo al crear o editar un objetivo.</p>}<div className="modal-actions"><Button variant="secondary" onClick={() => { setDetail(''); setEditor(ambition) }}>Editar ambición</Button></div></Modal>}
    {editor && <AmbitionForm initial={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSaved={id => { setEditor(null); setDetail(id) }} />}
  </>
}

function AmbitionForm({ initial, onClose, onSaved }: { initial?: Ambition; onClose: () => void; onSaved: (id: string) => void }) {
  const { run, busy } = useData()
  const [draft, setDraft] = useState<Ambition>(() => initial ? structuredClone(initial) : { id: uid(), projectId: project.id, type: 'AMBITION', title: '', description: '', category: '', owner: '', start: '', due: '', measurement: '', verification: '' })
  const [step, setStep] = useState(initial ? 1 : 0)
  const optional = ['DREAM', 'VISION', 'PURPOSE'].includes(draft.type)
  return <Modal title={step === 0 ? '¿Qué quieres construir?' : `${initial ? 'Editar' : 'Crear'} ${ambitionTypes.find(t => t.id === draft.type)?.title.toLowerCase()}`} description={step === 0 ? 'Elige la forma que mejor representa tu intención.' : 'Las ambiciones se mantienen visibles; los objetivos se vinculan desde el plan de trabajo.'} onClose={onClose} wide>{step === 0 ? <><div className="type-grid">{ambitionTypes.map(t => { const Icon = t.icon; return <button key={t.id} className={`type-card ${draft.type === t.id ? 'selected' : ''}`} aria-pressed={draft.type === t.id} onClick={() => setDraft({ ...draft, type: t.id as AmbitionType })}><Icon size={26} strokeWidth={1.5} /><strong>{t.title}</strong><p>{t.description}</p>{draft.type === t.id && <Check className="type-check" size={15} />}</button> })}</div><div className="modal-actions"><Button onClick={() => setStep(1)}>Continuar <ArrowRight size={16} /></Button></div></> : <form onSubmit={async e => { e.preventDefault(); if (await run({ type: 'ambition.save', value: draft }, 'Ambición guardada')) onSaved(draft.id) }}><Field label="Título"><input required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Escribe la intención que quieres alcanzar" /></Field><Field label="Descripción"><textarea rows={2} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field><Field label="Categoría (opcional)"><input value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /></Field><div className="form-grid"><Field label={`Responsable${optional ? ' (opcional)' : ''}`}><select required={!optional} value={draft.owner} onChange={e => setDraft({ ...draft, owner: e.target.value })}><option value="">Selecciona una persona</option>{people.map(p => <option key={p}>{p}</option>)}</select></Field><Field label={`Fecha de cumplimiento${optional ? ' (opcional)' : ''}`}><input type="date" required={!optional && draft.type !== 'AMBITION'} value={draft.due} onChange={e => setDraft({ ...draft, due: e.target.value })} /></Field></div>{['OBJECTIVE', 'GOAL'].includes(draft.type) && <Field label="Cómo se medirá"><textarea required rows={2} value={draft.measurement} onChange={e => setDraft({ ...draft, measurement: e.target.value })} /></Field>}{draft.type === 'MILESTONE' && <Field label="Verificación del hito"><textarea required rows={2} value={draft.verification} onChange={e => setDraft({ ...draft, verification: e.target.value })} /></Field>}{draft.type === 'PROJECT' && <Field label="Fecha de inicio"><input required type="date" max={draft.due || undefined} value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></Field>}<div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>Guardar ambición</Button></div></form>}</Modal>
}
