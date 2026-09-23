import { EmptyState } from '../../components/authenticated-shell'
import { sectionByHref } from '../../lib/navigation'

export default function InvitacionesPage() {
  const section = sectionByHref('/invitaciones')
  return <EmptyState title={section.emptyTitle} description={section.emptyDescription} />
}
