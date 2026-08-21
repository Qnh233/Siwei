import type { CSSProperties } from 'react'
import type { Edge } from 'reactflow'

import type { MindMapLayoutStrategy } from '../../types/document'
import type {
  MindMapAppearanceSettings,
  MindMapCanvasBackground,
} from '../../types/settings'

export type MindMapDiagramType = 'mindmap' | 'logic' | 'tree' | 'org' | 'timeline'

export interface MindMapDiagramPreset {
  id: MindMapDiagramType
  label: string
  description: string
  strategy: MindMapLayoutStrategy
}

export interface MindMapThemePreset {
  id: 'paper-ink' | 'engineering-grid' | 'soft-notes' | 'minimal-graphite' | 'teal-bubbles'
  label: string
  description: string
  appearance: MindMapAppearanceSettings
}

export const MIND_MAP_DIAGRAM_PRESETS: MindMapDiagramPreset[] = [
  { id: 'mindmap', label: '导图', description: '中心主题向两侧平衡展开', strategy: 'balanced-mindmap' },
  { id: 'logic', label: '逻辑图', description: '从左到右逐层推演', strategy: 'classic-dagre' },
  { id: 'tree', label: '树状图', description: '从上到下展开层级', strategy: 'tree-down' },
  { id: 'org', label: '组织结构图', description: '紧凑展示上下级关系', strategy: 'org-chart' },
  { id: 'timeline', label: '时间轴', description: '一级主题横向排列，细节向下展开', strategy: 'timeline' },
]

export const MIND_MAP_THEME_PRESETS: MindMapThemePreset[] = [
  {
    id: 'paper-ink',
    label: '纸墨',
    description: '温暖纸张、墨色曲线、柔和圆角',
    appearance: {
      canvasBackground: 'paper',
      hierarchyLineStyle: 'curve',
      hierarchyLinePattern: 'solid',
      hierarchyLineColor: '#9A755B',
      nodeShape: 'rounded',
      nodeBorderColor: '#B79272',
      nodeFillColor: '#FAF6EC',
    },
  },
  {
    id: 'engineering-grid',
    label: '工程网格',
    description: '网格底、直角蓝线、利落方框',
    appearance: {
      canvasBackground: 'grid',
      hierarchyLineStyle: 'orthogonal',
      hierarchyLinePattern: 'solid',
      hierarchyLineColor: '#53728B',
      nodeShape: 'square',
      nodeBorderColor: '#6C879A',
      nodeFillColor: '#F5F8F9',
    },
  },
  {
    id: 'soft-notes',
    label: '柔和笔记',
    description: '点阵底、虚线暖棕、轻盈圆角',
    appearance: {
      canvasBackground: 'dots',
      hierarchyLineStyle: 'curve',
      hierarchyLinePattern: 'dashed',
      hierarchyLineColor: '#B17854',
      nodeShape: 'rounded',
      nodeBorderColor: '#D09A72',
      nodeFillColor: '#FFF8ED',
    },
  },
  {
    id: 'minimal-graphite',
    label: '石墨极简',
    description: '纯色底、直线石墨、克制方框',
    appearance: {
      canvasBackground: 'plain',
      hierarchyLineStyle: 'straight',
      hierarchyLinePattern: 'solid',
      hierarchyLineColor: '#626262',
      nodeShape: 'square',
      nodeBorderColor: '#858585',
      nodeFillColor: '#FCFCFB',
    },
  },
  {
    id: 'teal-bubbles',
    label: '青绿气泡',
    description: '纯净底、青绿曲线、胶囊节点',
    appearance: {
      canvasBackground: 'plain',
      hierarchyLineStyle: 'curve',
      hierarchyLinePattern: 'solid',
      hierarchyLineColor: '#3F8078',
      nodeShape: 'pill',
      nodeBorderColor: '#5C978F',
      nodeFillColor: '#F0F8F6',
    },
  },
]

export function diagramTypeForStrategy(strategy: MindMapLayoutStrategy): MindMapDiagramType {
  return MIND_MAP_DIAGRAM_PRESETS.find((preset) => preset.strategy === strategy)?.id ?? 'logic'
}

export function strategyForDiagramType(type: MindMapDiagramType): MindMapLayoutStrategy {
  return MIND_MAP_DIAGRAM_PRESETS.find((preset) => preset.id === type)?.strategy ?? 'classic-dagre'
}

export function styleHierarchyEdges(edges: Edge[], appearance: MindMapAppearanceSettings): Edge[] {
  const strokeDasharray = appearance.hierarchyLinePattern === 'dashed' ? '7 5' : undefined

  return edges.map((edge) => {
    if (edge.data?.kind === 'relation') return edge

    if (appearance.hierarchyLineStyle === 'orthogonal') {
      return {
        ...edge,
        type: 'smoothstep',
        style: { ...edge.style, stroke: appearance.hierarchyLineColor, strokeWidth: 1.55, strokeDasharray },
      }
    }
    if (appearance.hierarchyLineStyle === 'straight') {
      return {
        ...edge,
        type: 'straight',
        style: { ...edge.style, stroke: appearance.hierarchyLineColor, strokeWidth: 1.45, strokeDasharray },
      }
    }
    return {
      ...edge,
      type: 'bezier',
      style: { ...edge.style, stroke: appearance.hierarchyLineColor, strokeWidth: 1.65, strokeDasharray },
    }
  })
}

export function mindMapCanvasBackgroundStyle(background: MindMapCanvasBackground): CSSProperties {
  if (background === 'plain') return { backgroundColor: '#FBFAF7' }
  if (background === 'paper') {
    return {
      backgroundColor: '#FBF8F1',
      backgroundImage: [
        'radial-gradient(circle at 18% 22%, rgba(148, 112, 77, 0.035) 0 1px, transparent 1.5px)',
        'radial-gradient(circle at 72% 64%, rgba(148, 112, 77, 0.025) 0 1px, transparent 1.4px)',
        'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(244,238,226,0.28))',
      ].join(','),
      backgroundSize: '18px 18px, 24px 24px, 100% 100%',
    }
  }
  return { backgroundColor: '#FBFAF7' }
}
