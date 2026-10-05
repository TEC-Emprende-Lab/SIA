import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

// Same DOM/classes as visual/prototype/src/ui.tsx, using the host React runtime.
export function ProjectHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div><div className="heading-actions">{action}</div></div>
}
export function ProjectPanel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <div className="panel-heading"><h2>{title}</h2>{action}</div>}{children}</section>
}
export function ProjectLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-link" onClick={onClick}>{children}<ArrowUpRight size={15} /></button>
}
export function ProjectProgress({ value, label = 'Avance' }: { value: number; label?: string }) {
  return <div className="progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>
}
