export type InlineContentToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'latex'; text: string }
  | { kind: 'documentReference'; text: string; occurrence: number }

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function pushText(tokens: InlineContentToken[], text: string) {
  if (!text) return
  const last = tokens[tokens.length - 1]
  if (last?.kind === 'text') {
    last.text += text
    return
  }
  tokens.push({ kind: 'text', text })
}

function malformedSpanEnd(text: string, start: number): number {
  const nextSpace = text.slice(start).search(/\s/)
  return nextSpace === -1 ? text.length : start + nextSpace
}

export function parseInlineNodeContent(text: string): InlineContentToken[] {
  const tokens: InlineContentToken[] = []
  let index = 0
  let documentReferenceOccurrence = 0

  while (index < text.length) {
    const rest = text.slice(index)
    const documentReference = rest.match(/^\[\[([^\[\]\n]+)\]\]/)
    if (documentReference) {
      const [raw, label] = documentReference
      const trimmedLabel = label.trim()
      if (!trimmedLabel) {
        pushText(tokens, raw)
        index += raw.length
        continue
      }
      tokens.push({
        kind: 'documentReference',
        text: trimmedLabel,
        occurrence: documentReferenceOccurrence,
      })
      documentReferenceOccurrence += 1
      index += raw.length
      continue
    }
    if (rest.startsWith('[[')) {
      // 未闭合 wiki 引用按普通文本处理，并确保解析游标前进。
      pushText(tokens, '[[')
      index += 2
      continue
    }
    const markdownLink = rest.match(/^\[([^\]]+)]\(([^)]+)\)/)
    if (markdownLink) {
      const [raw, label, href] = markdownLink
      if (isHttpUrl(href)) {
        tokens.push({ kind: 'link', text: label, href })
      } else {
        pushText(tokens, raw)
      }
      index += raw.length
      continue
    }

    const bareUrl = rest.match(/^https?:\/\/[^\s)]+/i)
    if (bareUrl) {
      const href = bareUrl[0]
      tokens.push({ kind: 'link', text: href, href })
      index += href.length
      continue
    }

    if (rest.startsWith('**')) {
      const end = text.indexOf('**', index + 2)
      if (end === -1) {
        pushText(tokens, text.slice(index))
        break
      }
      tokens.push({ kind: 'bold', text: text.slice(index + 2, end) })
      index = end + 2
      continue
    }

    if (rest.startsWith('`')) {
      const end = text.indexOf('`', index + 1)
      if (end === -1) {
        pushText(tokens, text.slice(index, malformedSpanEnd(text, index + 1)))
        index = malformedSpanEnd(text, index + 1)
        continue
      }
      tokens.push({ kind: 'code', text: text.slice(index + 1, end) })
      index = end + 1
      continue
    }

    if (rest.startsWith('$')) {
      const end = text.indexOf('$', index + 1)
      if (end === -1) {
        const fallbackEnd = malformedSpanEnd(text, index + 1)
        pushText(tokens, text.slice(index, fallbackEnd))
        index = fallbackEnd
        continue
      }
      tokens.push({ kind: 'latex', text: text.slice(index + 1, end) })
      index = end + 1
      continue
    }

    if (rest.startsWith('*')) {
      const end = text.indexOf('*', index + 1)
      if (end === -1) {
        pushText(tokens, text.slice(index, malformedSpanEnd(text, index + 1)))
        index = malformedSpanEnd(text, index + 1)
        continue
      }
      tokens.push({ kind: 'italic', text: text.slice(index + 1, end) })
      index = end + 1
      continue
    }

    const nextSpecial = rest.search(/(\[\[|\*\*|\*|`|\$|\[[^\]]+]\(|https?:\/\/)/i)
    if (nextSpecial === -1) {
      pushText(tokens, rest)
      break
    }

    pushText(tokens, rest.slice(0, nextSpecial))
    index += nextSpecial
  }

  return tokens.length > 0 ? tokens : [{ kind: 'text', text }]
}
