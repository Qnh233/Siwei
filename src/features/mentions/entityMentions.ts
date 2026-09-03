import type { EntityMention, EntityMentionKind, OutlineNode } from '../../types/document'

const ENTITY_MENTION_PATTERN = /(^|[\s(\[{，。！？、])@([A-Za-z0-9_-]+)/g
const ENTITY_MENTION_QUERY_PATTERN = /^[\p{L}\p{N}_-]+$/u

export interface EntityMentionTarget {
  kind: EntityMentionKind
  id: string
  label: string
  mentionText: string
  aliases?: string[]
}

export interface EntityMentionQuery {
  start: number
  end: number
  query: string
}

export const BUILTIN_ENTITY_MENTION_TARGETS: EntityMentionTarget[] = [
  {
    kind: 'agent',
    id: 'siwei-agent',
    label: 'Siwei Agent',
    mentionText: 'SiweiAgent',
    aliases: ['siwei', 'agent', 'assistant', '智能体'],
  },
]

function isMentionBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s(\[{，。！？、]/u.test(char)
}

export function matchEntityMentionAt(
  text: string,
  index: number,
): { mentionText: string; length: number } | null {
  if (text[index] !== '@' || !isMentionBoundary(index === 0 ? undefined : text[index - 1])) return null
  const match = text.slice(index).match(/^@([A-Za-z0-9_-]+)/)
  if (!match) return null
  return { mentionText: match[1], length: match[0].length }
}

export function extractEntityMentionTexts(text: string): string[] {
  return [...text.matchAll(ENTITY_MENTION_PATTERN)].map((match) => match[2])
}

export function findEntityMentionQuery(text: string, caret: number): EntityMentionQuery | null {
  const prefix = text.slice(0, caret)
  const start = prefix.lastIndexOf('@')
  if (start < 0 || !isMentionBoundary(start === 0 ? undefined : prefix[start - 1])) return null
  const fragment = prefix.slice(start + 1)
  if (fragment.includes('\n') || (fragment && !ENTITY_MENTION_QUERY_PATTERN.test(fragment))) return null
  return { start, end: caret, query: fragment }
}

export function searchEntityMentionTargets(
  query: string,
  targets: EntityMentionTarget[] = BUILTIN_ENTITY_MENTION_TARGETS,
): EntityMentionTarget[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return targets
  return targets.filter((target) => [target.label, target.mentionText, ...(target.aliases ?? [])]
    .some((value) => value.toLocaleLowerCase().includes(normalized)))
}

export function entityMentionsForNode(
  mentions: EntityMention[] | undefined,
  nodeId: string,
): EntityMention[] {
  return (mentions ?? [])
    .filter((mention) => mention.sourceNodeId === nodeId)
    .sort((left, right) => left.sourceOccurrence - right.sourceOccurrence)
}

export function reconcileEntityMentions(
  text: string,
  mentions: EntityMention[] | undefined,
  sourceNodeId: string,
): EntityMention[] {
  const mentionTexts = extractEntityMentionTexts(text)
  const available = entityMentionsForNode(mentions, sourceNodeId)
  const used = new Set<string>()
  const next: EntityMention[] = []

  mentionTexts.forEach((mentionText, sourceOccurrence) => {
    const match = available.find((mention) => mention.mentionText === mentionText && !used.has(mention.id))
    if (!match) return
    used.add(match.id)
    next.push({ ...match, sourceOccurrence })
  })

  return next
}

export function pruneEntityMentions(
  mentions: EntityMention[] | undefined,
  root: OutlineNode,
): EntityMention[] | undefined {
  if (!mentions?.length) return undefined
  const nodes: OutlineNode[] = []
  const visit = (node: OutlineNode) => {
    nodes.push(node)
    node.children.forEach(visit)
  }
  visit(root)
  const next = nodes.flatMap((node) => reconcileEntityMentions(node.text, mentions, node.id))
  return next.length > 0 ? next : undefined
}

export function insertEntityMentionText(options: {
  text: string
  mentions: EntityMention[] | undefined
  sourceNodeId: string
  rangeStart: number
  rangeEnd: number
  target: EntityMentionTarget
  now: number
  id: string
}): { text: string; mentions: EntityMention[] } {
  const { text, mentions, sourceNodeId, rangeStart, rangeEnd, target, now, id } = options
  const syntax = `@${target.mentionText}`
  const nextText = `${text.slice(0, rangeStart)}${syntax}${text.slice(rangeEnd)}`
  const occurrence = extractEntityMentionTexts(nextText.slice(0, rangeStart + syntax.length)).length - 1
  const nodeMentions = entityMentionsForNode(mentions, sourceNodeId)
  const inserted: EntityMention = {
    id,
    sourceNodeId,
    sourceOccurrence: occurrence,
    kind: target.kind,
    targetId: target.id,
    mentionText: target.mentionText,
    label: target.label,
    createdAt: now,
    updatedAt: now,
  }
  const shifted = nodeMentions.map((mention) => mention.sourceOccurrence >= occurrence
    ? { ...mention, sourceOccurrence: mention.sourceOccurrence + 1 }
    : mention)

  return {
    text: nextText,
    mentions: [...shifted, inserted].sort((left, right) => left.sourceOccurrence - right.sourceOccurrence),
  }
}
