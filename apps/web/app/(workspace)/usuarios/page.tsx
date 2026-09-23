import { EmptyState } from '../../components/authenticated-shell'
import { sectionByHref } from '../../lib/navigation'

export default function UsuariosPage() {
  const section = sectionByHref('/usuarios')
  return <EmptyState title={section.emptyTitle} description={section.emptyDescription} />
}
