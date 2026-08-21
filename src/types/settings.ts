import type { KeybindingSettings } from '../app/keybindings/keybindingTypes'

export type DefaultViewMode = 'outline' | 'mindmap' | 'split'
export type ThemeMode = 'light' | 'dark' | 'system'
export type AgentThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
export type AgentContextScope = 'currentDocument'
export type MindMapCanvasBackground = 'paper' | 'dots' | 'grid' | 'plain'
export type MindMapHierarchyLineStyle = 'curve' | 'orthogonal' | 'straight'
export type MindMapHierarchyLinePattern = 'solid' | 'dashed'
export type MindMapNodeShape = 'rounded' | 'pill' | 'square'

export interface MindMapAppearanceSettings {
  canvasBackground: MindMapCanvasBackground
  hierarchyLineStyle: MindMapHierarchyLineStyle
  hierarchyLinePattern: MindMapHierarchyLinePattern
  hierarchyLineColor: string
  nodeShape: MindMapNodeShape
  nodeBorderColor: string
  nodeFillColor: string
}

export interface AgentSettings {
  enabled: boolean
  provider: string
  model: string
  baseUrl: string
  thinkingLevel: AgentThinkingLevel
  contextScope: AgentContextScope
}

export interface AppSettings {
  autoSaveEnabled: boolean
  autoSaveIntervalMs: number
  documentLibraryPath: string
  defaultViewMode: DefaultViewMode
  sidebarCollapsed: boolean
  theme: ThemeMode
  focusMode: boolean
  experimentalMindMapLayoutEngine: boolean
  mindMapAppearance: MindMapAppearanceSettings
  keybindings: KeybindingSettings
  agent: AgentSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSaveEnabled: true,
  autoSaveIntervalMs: 1500,
  documentLibraryPath: '/Documents/Siwei',
  defaultViewMode: 'outline',
  sidebarCollapsed: false,
  theme: 'system',
  focusMode: false,
  experimentalMindMapLayoutEngine: false,
  mindMapAppearance: {
    canvasBackground: 'paper',
    hierarchyLineStyle: 'curve',
    hierarchyLinePattern: 'solid',
    hierarchyLineColor: '#AA8C72',
    nodeShape: 'rounded',
    nodeBorderColor: '#B79272',
    nodeFillColor: '#FAF6EC',
  },
  keybindings: { overrides: {} },
  agent: {
    enabled: false,
    provider: 'openai-compatible',
    model: 'gpt-4.1',
    baseUrl: 'https://api.openai.com/v1',
    thinkingLevel: 'medium',
    contextScope: 'currentDocument',
  },
}
