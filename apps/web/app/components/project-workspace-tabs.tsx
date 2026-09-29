'use client'

import * as Tabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

import styles from './expediente.module.css'

type ProjectWorkspaceTab = {
  value: string
  label: string
  content: ReactNode
}

type CycleWorkspaceTab = {
  id: string
  name: string
}

export function ProjectWorkspaceTabs({ tabs }: { tabs: ProjectWorkspaceTab[] }) {
  return (
    <Tabs.Root className={styles.workspaceTabs} defaultValue={tabs[0]?.value}>
      <Tabs.List className={styles.projectTabs} aria-label="Secciones del proyecto">
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} className={styles.projectTab} value={tab.value}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} className={styles.projectTabContent} value={tab.value}>
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}

/**
 * Cambia entre ciclos ya autorizados sin navegar fuera de la inscripción.
 * La ruta individual del ciclo se conserva para enlaces directos y el caso de un único ciclo.
 */
export function CycleWorkspaceTabs<T extends CycleWorkspaceTab>({
  cycles,
  children,
}: {
  cycles: T[]
  children: (cycle: T) => ReactNode
}) {
  return (
    <Tabs.Root className={styles.cycleWorkspace} defaultValue={cycles[0]?.id}>
      <Tabs.List className={styles.cycleTabs} aria-label="Ciclos de esta inscripción">
        {cycles.map((cycle) => (
          <Tabs.Trigger key={cycle.id} className={styles.cycleTab} value={cycle.id}>
            {cycle.name}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {cycles.map((cycle) => (
        <Tabs.Content key={cycle.id} className={styles.cycleTabContent} value={cycle.id}>
          {children(cycle)}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
