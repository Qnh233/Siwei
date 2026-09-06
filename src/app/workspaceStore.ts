import { create } from 'zustand'

export type WorkspaceView = 'editor' | 'library' | 'graph' | 'settings'
export type ActiveSurface = 'outline' | 'mindmap' | null
export type NodeRevealSource = 'outline' | 'mindmap' | 'external'

export interface NodeRevealRequest {
  nodeId: string
  source: NodeRevealSource
  seq: number
}

interface WorkspaceState {
  activeView: WorkspaceView
  activeSurface: ActiveSurface
  nodeRevealRequest: NodeRevealRequest | null
  setActiveView: (view: WorkspaceView) => void
  setActiveSurface: (surface: ActiveSurface) => void
  requestNodeReveal: (nodeId: string, source: NodeRevealSource) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeView: 'editor',
  activeSurface: null,
  nodeRevealRequest: null,
  setActiveView: (activeView) => set({ activeView }),
  setActiveSurface: (activeSurface) => set({ activeSurface }),
  requestNodeReveal: (nodeId, source) => set((state) => ({
    nodeRevealRequest: {
      nodeId,
      source,
      seq: (state.nodeRevealRequest?.seq ?? 0) + 1,
    },
  })),
}))
