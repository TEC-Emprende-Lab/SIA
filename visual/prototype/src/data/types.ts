export type Role = 'Coordinadora' | 'Gestor' | 'Emprendedor'
export type Status = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ARCHIVED'
export type AmbitionType = 'DREAM' | 'VISION' | 'PURPOSE' | 'AMBITION' | 'OBJECTIVE' | 'GOAL' | 'MILESTONE' | 'PROJECT'
export interface Area { id: string; name: string; short: string; question: string; color: string; icon: string }
export interface Assessment { areaId: string; name: string; question: string; score: number; observation: string }
export interface Diagnostic { id: string; projectId: string; date: string; type: 'INITIAL' | 'FOLLOW_UP' | 'CLOSURE'; author: string; status: Status; observation: string; assessments: Assessment[]; supersedes?: string; approvedBy?: string; approvedAt?: string }
export interface Ambition { id: string; projectId: string; type: AmbitionType; title: string; description: string; category: string; owner: string; start: string; due: string; measurement: string; verification: string }
export interface Objective { id: string; projectId: string; areaId: string; ambitionId?: string; title: string; description: string; status: 'PENDING_APPROVAL' | 'APPROVED'; date: string; approvedBy?: string; approvedAt?: string }
export interface Activity { id: string; objectiveId: string; title: string; owner: string; date: string; status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'; autoComplete: boolean; completedAt?: string }
export interface Evidence { id: string; activityId: string; title: string; type: 'FILE' | 'IMAGE' | 'VIDEO' | 'LINK'; date: string; author: string; content: string; url?: string }
export interface Meeting { id: string; projectId: string; title: string; date: string; time: string; minutes: string; agreements: string }
export interface Source { id: string; kind: string; title: string; date: string; content: string }
export interface ReportSection { title: string; content: string; sourceIds: string[] }
export interface Report { id: string; projectId: string; groupId: string; type: 'FOLLOW_UP' | 'CLOSURE'; start: string; end: string; version: number; status: Status; author: string; createdAt: string; approvedBy?: string; approvedAt?: string; supersedes?: string; sources: Source[]; sections: ReportSection[] }
export interface Audit { id: string; entityId: string; action: string; actor: string; date: string; before?: unknown; after?: unknown }
export interface Store { diagnostics: Diagnostic[]; ambitions: Ambition[]; objectives: Objective[]; activities: Activity[]; evidence: Evidence[]; meetings: Meeting[]; reports: Report[]; audit: Audit[]; messages: { id: string; author: string; content: string; date: string }[] }
