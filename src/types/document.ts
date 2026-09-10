export interface OutlineDocument {
  id: string
  title: string
  version: number
  createdAt: number
  updatedAt: number
  mindMapLayout?: MindMapLayoutState
  relations?: NodeRelation[]
  documentReferences?: DocumentReference[]
  entityMentions?: EntityMention[]
  root: OutlineNode
}

export interface DocumentReference {
  id: string
  sourceNodeId: string
  sourceOccurrence: number
  targetDocumentId: string
  targetPath: string
  label: string
  createdAt: number
  updatedAt: number
}

export type EntityMentionKind = 'agent' | (string & {})

export interface EntityMention {
  id: string
  sourceNodeId: string
  sourceOccurrence: number
  kind: EntityMentionKind
  targetId: string
  mentionText: string
  label: string
  createdAt: number
  updatedAt: number
}

export type NodeRelationDirection = 'one-way' | 'two-way'
export type NodeRelationHandle = 'top' | 'right' | 'bottom' | 'left'

export interface NodeRelationCurveOffset {
  x: number
  y: number
}

export interface NodeRelation {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle?: NodeRelationHandle
  targetHandle?: NodeRelationHandle
  curveOffset?: NodeRelationCurveOffset
  direction: NodeRelationDirection
  label?: string
  createdAt: number
  updatedAt: number
}

export interface MindMapLayoutPosition {
  x: number
  y: number
}

export type MindMapLayoutStrategy =
  | 'classic-dagre'
  | 'balanced-mindmap'
  | 'tree-down'
  | 'org-chart'
  | 'timeline'
  | 'radial-mindmap'
  | 'free-canvas'
  | 'force-directed'
  | (string & {})
export type MindMapLayoutNodeSource = 'auto' | 'manual' | 'incremental' | 'force-applied'

export interface MindMapLayoutState {
  engineVersion: number
  strategy: MindMapLayoutStrategy
  nodes: Record<string, MindMapLayoutNodeState>
}

export interface MindMapLayoutNodeState {
  position: MindMapLayoutPosition
  source: MindMapLayoutNodeSource
  locked: boolean
  updatedAt?: number
}

export interface OutlineNode {
  id: string
  text: string
  note?: string
  collapsed?: boolean
  checked?: boolean
  tags?: string[]
  createdAt: number
  updatedAt: number
  children: OutlineNode[]
}

export type ImportFormat = 'json' | 'markdown' | 'opml' | 'freemind'
export type ExportFormat = 'json' | 'markdown' | 'opml' | 'freemind' | 'html' | 'text'

export interface ImportPreview {
  document: OutlineDocument
  summary: ImportSummary
  report: ImportReport
}

export interface ImportSummary {
  title: string
  nodeCount: number
  maxDepth: number
  taskCount: number
  tagCount: number
  noteCount: number
  warningCount: number
}

export interface ImportReport {
  items: ImportReportItem[]
}

export interface ImportReportItem {
  severity: 'info' | 'warning'
  nodePath: string[]
  field: string
  value: string
  action: string
}

export type ImportApplyMode = 'newDocument' | 'appendToRoot' | 'appendToSelection'

export interface ImportApplyOptions {
  mode: ImportApplyMode
}

export interface RecentDocItem {
  path: string
  title: string
  lastOpenedAt: number
}

export type SearchMatchSource = 'text' | 'note' | 'tag'

export interface SearchMatch {
  source: SearchMatchSource
  value: string
  matchIndices: Array<[number, number]>
}

export interface SearchResult {
  nodeId: string
  text: string
  path: string[]
  matchIndices: Array<[number, number]>
  matchSources: SearchMatchSource[]
  matches: SearchMatch[]
}
