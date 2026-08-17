export type KeybindingScope = 'global' | 'outline' | 'mindmap'

export type KeybindingCommandId =
  | 'app.save'
  | 'app.newDocument'
  | 'app.search'
  | 'app.commandPalette'
  | 'edit.undo'
  | 'edit.redo'
  | 'view.focusMode'
  | 'view.outline'
  | 'view.mindmap'
  | 'view.split'
  | 'outline.indent'
  | 'outline.outdent'
  | 'outline.moveUp'
  | 'outline.moveDown'
  | 'outline.toggleChecked'
  | 'mindmap.insertSibling'
  | 'mindmap.insertChild'
  | 'mindmap.indent'
  | 'mindmap.outdent'
  | 'mindmap.moveUp'
  | 'mindmap.moveDown'
  | 'mindmap.toggleChecked'

export interface KeybindingCommand {
  id: KeybindingCommandId
  label: string
  scope: KeybindingScope
  defaultKeys: string[]
}

export type KeybindingOverrides = Partial<Record<KeybindingCommandId, string[]>>

export interface KeybindingSettings {
  overrides: KeybindingOverrides
}
