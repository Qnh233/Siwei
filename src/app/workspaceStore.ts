import { create } from 'zustand'

export type WorkspaceView = 'editor' | 'library' | 'settings'
export type ActiveSurface = 'outline' | 'mindmap' | null

interface WorkspaceState {
  activeView: WorkspaceView
  activeSurface: ActiveSurface
  setActiveView: (view: WorkspaceView) => void
  setActiveSurface: (surface: ActiveSurface) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeView: 'editor',
  activeSurface: null,
  setActiveView: (activeView) => set({ activeView }),
  setActiveSurface: (activeSurface) => set({ activeSurface }),
}))
