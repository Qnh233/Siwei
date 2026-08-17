import { describe, expect, it } from 'vitest'

import { findKeybindingConflict } from './keybindingConflicts'

describe('findKeybindingConflict', () => {
  it('reports a hard conflict inside the same scope', () => {
    expect(findKeybindingConflict('mindmap.insertChild', 'Tab', {})).toEqual({
      type: 'hard-conflict',
      commandId: 'mindmap.indent',
    })
  })

  it('allows local bindings to shadow a global binding', () => {
    expect(findKeybindingConflict('mindmap.insertChild', 'Mod+K', {})).toEqual({
      type: 'shadow-global',
      commandId: 'app.commandPalette',
    })
  })

  it('warns when a global binding will be shadowed by a local binding', () => {
    expect(findKeybindingConflict('app.save', 'Tab', {})).toEqual({
      type: 'shadow-global',
      commandId: 'outline.indent',
    })
  })

  it('returns no conflict for an unused binding', () => {
    expect(findKeybindingConflict('mindmap.insertChild', 'Alt+9', {})).toEqual({ type: 'none' })
  })
})
