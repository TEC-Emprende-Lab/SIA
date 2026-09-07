import { createContext, useContext } from 'react'
import type { Command } from './data/repository'
import type { Store, Role } from './data/types'

export type Section = 'Resumen' | 'Diagnóstico 360°' | 'Necesidades' | 'Ambiciones' | 'Objetivos y actividades' | 'Evidencias' | 'Evolución' | 'Informes' | 'Reuniones' | 'Finanzas y compras' | 'Chat' | 'Equipo' | 'Alertas'
export interface Context { data: Store; role: Role; busy: boolean; run: (command: Command, message?: string) => Promise<Store | null>; navigate: (section: Section, id?: string) => void; notify: (text: string) => void }
export const DataContext = createContext<Context | null>(null)
export const useData = () => useContext(DataContext)!
export const dateLabel = (date: string) => date ? new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date.slice(0, 10)}T12:00:00`)) : 'Sin fecha'
export const initials = (name: string) => name.split(' ').map(x => x[0]).slice(0, 2).join('')
