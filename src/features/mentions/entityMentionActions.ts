import type { EntityMention } from '../../types/document'
import { useAgentStore } from '../agent/agentStore'

export function canActivateEntityMention(mention: EntityMention): boolean {
  return mention.kind === 'agent' && mention.targetId === 'siwei-agent'
}

export function activateEntityMention(mention: EntityMention): boolean {
  if (!canActivateEntityMention(mention)) return false
  useAgentStore.getState().setOpen(true)
  return true
}
