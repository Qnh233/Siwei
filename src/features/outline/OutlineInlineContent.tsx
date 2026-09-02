import React from 'react'
import { BookOpen } from 'lucide-react'

import { parseInlineNodeContent } from './inlineContentParser'
import { useDocumentStore } from '../document/documentStore'
import { openDocumentReference } from '../references/documentReferenceNavigation'
import { toast } from '../../components/common/Toast'

interface OutlineInlineContentProps {
  text: string
  nodeId?: string
  interactiveDocumentReferences?: boolean
}

export const OutlineInlineContent: React.FC<OutlineInlineContentProps> = ({
  text,
  nodeId,
  interactiveDocumentReferences = true,
}) => {
  const tokens = React.useMemo(() => parseInlineNodeContent(text), [text])
  const documentReferences = useDocumentStore((state) => state.currentDoc?.documentReferences)

  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.kind}-${index}`

        switch (token.kind) {
          case 'bold':
            return <strong key={key}>{token.text}</strong>
          case 'italic':
            return <em key={key}>{token.text}</em>
          case 'code':
            return (
              <code
                key={key}
                className="rounded border border-amber-900/15 bg-amber-50 px-1 py-0.5 font-mono text-[0.85em] text-amber-950"
              >
                {token.text}
              </code>
            )
          case 'link':
            return (
              <a
                key={key}
                href={token.href}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                onClick={(event) => event.stopPropagation()}
              >
                {token.text}
              </a>
            )
          case 'latex':
            return (
              <span
                key={key}
                data-inline-latex
                className="rounded bg-zinc-100 px-1 font-serif text-[0.92em] text-zinc-800"
              >
                {token.text}
              </span>
            )
          case 'documentReference': {
            const reference = nodeId
              ? documentReferences?.find((item) =>
                  item.sourceNodeId === nodeId
                  && item.sourceOccurrence === token.occurrence
                  && item.label === token.text)
              : undefined
            const content = (
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-[0.9em] w-[0.9em]" />
                {token.text}
              </span>
            )

            if (!reference || !interactiveDocumentReferences) {
              return (
                <span
                  key={key}
                  data-document-reference={reference ? 'resolved' : 'unresolved'}
                  className={`mx-0.5 inline-flex rounded px-1 py-0.5 text-[0.92em] ${
                    reference
                      ? 'bg-amber-100/70 text-amber-900'
                      : 'border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500'
                  }`}
                  title={reference ? `引用：${reference.label}` : '未解析的文档引用'}
                >
                  {content}
                </span>
              )
            }

            return (
              <button
                key={key}
                type="button"
                data-document-reference="resolved"
                className="mx-0.5 inline-flex rounded bg-amber-100/75 px-1 py-0.5 text-[0.92em] font-medium text-amber-900 outline-none transition hover:bg-amber-200/75 focus-visible:ring-1 focus-visible:ring-amber-400"
                title={`打开 ${reference.label}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  void openDocumentReference(reference).catch((error) => {
                    toast.error(`无法打开引用文档：${String(error)}`)
                  })
                }}
              >
                {content}
              </button>
            )
          }
          default:
            return <React.Fragment key={key}>{token.text}</React.Fragment>
        }
      })}
    </>
  )
}
