import React from 'react'

import { useWorkspaceStore, type ActiveSurface } from '../workspaceStore'

interface KeybindingSurfaceProps {
  scope: Exclude<ActiveSurface, null>
  className?: string
  children: React.ReactNode
}

export const KeybindingSurface: React.FC<KeybindingSurfaceProps> = ({ scope, className, children }) => {
  const activeSurface = useWorkspaceStore((state) => state.activeSurface)
  const setActiveSurface = useWorkspaceStore((state) => state.setActiveSurface)
  const activate = React.useCallback(() => setActiveSurface(scope), [scope, setActiveSurface])

  return (
    <div
      data-keybinding-scope={scope}
      data-keybinding-active={activeSurface === scope ? 'true' : 'false'}
      className={className}
      onPointerDownCapture={activate}
      onFocusCapture={activate}
    >
      {children}
    </div>
  )
}
