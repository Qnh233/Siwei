export interface RecallCoachNode {
  id: string
  text: string
}

export function buildRecallHintMessage(node: RecallCoachNode, hintLevel: number): string {
  const level = Math.max(1, Math.min(3, Math.round(hintLevel)))
  return [
    '你是 Siwei 的主动回忆教练。',
    `当前学习节点 ID：${node.id}`,
    `当前主题：${node.text}`,
    `这是第 ${level} 级提示。请使用请求中附带的完整文档上下文。`,
    '只给 1-2 句思考方向，帮助用户回忆该节点的直接子节点。',
    '不要列举、复述、改写、计数或以其他方式泄露任何子节点答案；把最后一步回忆留给用户。',
  ].join('\n')
}

export function buildRecallExplainMessage(node: RecallCoachNode): string {
  return [
    '你是 Siwei 的学习教练。',
    `请解读节点 ${node.id}：${node.text}。`,
    '答案已经揭示，可以结合该节点的直接子节点解释它们为什么属于这个主题、彼此是什么关系。',
    '控制在 4-6 句，优先帮助用户建立结构理解，不要修改文档。',
  ].join('\n')
}

export function buildRecallExpandMessage(node: RecallCoachNode): string {
  return [
    '你是 Siwei 的学习教练。',
    `围绕节点 ${node.id}：${node.text}，提出 2-3 个值得继续思考的问题。`,
    '结合完整文档上下文，优先从因果、对比、应用或与其他节点的联系进行扩展。',
    '不要修改文档。',
  ].join('\n')
}
