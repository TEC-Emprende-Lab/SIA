import { EmptyState } from '../../components/authenticated-shell'
import { sectionByHref } from '../../lib/navigation'

export default function ExpedientePage() {
  const section = sectionByHref('/expediente')
  return <EmptyState title={section.emptyTitle} description={section.emptyDescription} />
}
