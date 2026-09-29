'use client'

import * as Tabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

import styles from './expediente.module.css'

type ProjectWorkspaceTab = {
  value: string
  label: string
  content: ReactNode
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
