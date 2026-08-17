import type { KeybindingCommand, KeybindingCommandId, KeybindingScope } from './keybindingTypes'

export const KEYBINDING_COMMANDS: KeybindingCommand[] = [
  { id: 'app.save', label: '保存', scope: 'global', defaultKeys: ['Mod+S'] },
  { id: 'app.newDocument', label: '新建文档', scope: 'global', defaultKeys: ['Mod+N'] },
  { id: 'edit.undo', label: '撤销', scope: 'global', defaultKeys: ['Mod+Z'] },
  { id: 'edit.redo', label: '重做', scope: 'global', defaultKeys: ['Mod+Shift+Z'] },
  { id: 'app.search', label: '搜索', scope: 'global', defaultKeys: ['Mod+F'] },
  { id: 'app.commandPalette', label: '命令面板', scope: 'global', defaultKeys: ['Mod+K'] },
  { id: 'view.focusMode', label: '专注模式', scope: 'global', defaultKeys: ['F11', 'Mod+\\'] },
  { id: 'view.outline', label: '切换到大纲', scope: 'global', defaultKeys: ['Alt+1'] },
  { id: 'view.mindmap', label: '切换到思维导图', scope: 'global', defaultKeys: ['Alt+2'] },
  { id: 'view.split', label: '切换到分屏', scope: 'global', defaultKeys: ['Alt+3'] },

  { id: 'outline.indent', label: '大纲：缩进', scope: 'outline', defaultKeys: ['Tab'] },
  { id: 'outline.outdent', label: '大纲：提升', scope: 'outline', defaultKeys: ['Shift+Tab'] },
  { id: 'outline.moveUp', label: '大纲：上移节点', scope: 'outline', defaultKeys: ['Mod+ArrowUp'] },
  { id: 'outline.moveDown', label: '大纲：下移节点', scope: 'outline', defaultKeys: ['Mod+ArrowDown'] },
  { id: 'outline.toggleChecked', label: '大纲：切换待办', scope: 'outline', defaultKeys: ['Mod+Enter'] },

  { id: 'mindmap.insertSibling', label: '思维导图：新增同级节点', scope: 'mindmap', defaultKeys: ['Enter'] },
  { id: 'mindmap.insertChild', label: '思维导图：新增子节点', scope: 'mindmap', defaultKeys: ['Shift+Enter'] },
  { id: 'mindmap.indent', label: '思维导图：缩进', scope: 'mindmap', defaultKeys: ['Tab'] },
  { id: 'mindmap.outdent', label: '思维导图：提升', scope: 'mindmap', defaultKeys: ['Shift+Tab'] },
  { id: 'mindmap.moveUp', label: '思维导图：上移节点', scope: 'mindmap', defaultKeys: ['Mod+ArrowUp'] },
  { id: 'mindmap.moveDown', label: '思维导图：下移节点', scope: 'mindmap', defaultKeys: ['Mod+ArrowDown'] },
  { id: 'mindmap.toggleChecked', label: '思维导图：切换待办', scope: 'mindmap', defaultKeys: ['Mod+Enter'] },
]

export const COMMAND_BY_ID = new Map<KeybindingCommandId, KeybindingCommand>(
  KEYBINDING_COMMANDS.map((command) => [command.id, command]),
)

export function commandsForScope(scope: KeybindingScope): KeybindingCommand[] {
  return KEYBINDING_COMMANDS.filter((command) => command.scope === scope)
}
