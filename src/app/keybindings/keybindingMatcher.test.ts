import { describe, expect, it } from 'vitest'

import { findKeybindingCommand, keyboardEventToKeybinding } from './keybindingMatcher'

const event = (key: string, modifiers: Partial<KeyboardEvent> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
}) as KeyboardEvent

describe('keybindingMatcher', () => {
  it('keeps existing defaults when no override exists', () => {
    expect(findKeybindingCommand('global', event('s', { ctrlKey: true }), {}, false)?.id).toBe('app.save')
    expect(findKeybindingCommand('mindmap', event('Enter', { shiftKey: true }), {}, false)?.id).toBe('mindmap.insertChild')
  })

  it('uses an override instead of the command default', () => {
    const overrides = { 'mindmap.insertChild': ['Tab'] }

    expect(findKeybindingCommand('mindmap', event('Tab'), overrides, false)?.id).toBe('mindmap.insertChild')
    expect(findKeybindingCommand('mindmap', event('Enter', { shiftKey: true }), overrides, false)).toBeNull()
  })

  it('treats an empty override as explicitly disabled', () => {
    const overrides = { 'mindmap.indent': [] }

    expect(findKeybindingCommand('mindmap', event('Tab'), overrides, false)).toBeNull()
  })

  it('normalizes the platform primary modifier to Mod', () => {
    expect(keyboardEventToKeybinding(event('k', { ctrlKey: true }), false)).toBe('Mod+K')
    expect(keyboardEventToKeybinding(event('k', { metaKey: true }), true)).toBe('Mod+K')
    expect(keyboardEventToKeybinding(event('Shift'), false)).toBeNull()
  })
})
