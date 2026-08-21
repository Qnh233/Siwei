import { describe, expect, it } from 'vitest'

import {
  diagramTypeForStrategy,
  mindMapCanvasBackgroundStyle,
  strategyForDiagramType,
  styleHierarchyEdges,
  MIND_MAP_THEME_PRESETS,
} from './mindMapVisualPresets'
import { DEFAULT_SETTINGS } from '../../types/settings'

describe('mindMapVisualPresets', () => {
  it('maps product diagram types to stable layout strategies', () => {
    expect(strategyForDiagramType('mindmap')).toBe('balanced-mindmap')
    expect(strategyForDiagramType('logic')).toBe('classic-dagre')
    expect(strategyForDiagramType('tree')).toBe('tree-down')
    expect(strategyForDiagramType('org')).toBe('org-chart')
    expect(strategyForDiagramType('timeline')).toBe('timeline')
    expect(diagramTypeForStrategy('tree-down')).toBe('tree')
  })

  it('changes hierarchy geometry without touching semantic relation edges', () => {
    const hierarchyEdge = { id: 'a-b', source: 'a', target: 'b', type: 'smoothstep' }
    const relationEdge = { id: 'relation-1', source: 'a', target: 'b', type: 'relation', data: { kind: 'relation' } }

    const styled = styleHierarchyEdges([hierarchyEdge, relationEdge], {
      ...DEFAULT_SETTINGS.mindMapAppearance,
      hierarchyLineStyle: 'straight',
      hierarchyLinePattern: 'dashed',
      hierarchyLineColor: '#53728B',
    })

    expect(styled[0]).toMatchObject({
      type: 'straight',
      style: { stroke: '#53728B', strokeDasharray: '7 5' },
    })
    expect(styled[1]).toEqual(relationEdge)
  })

  it('ships themes as editable appearance bundles instead of layout strategies', () => {
    const engineering = MIND_MAP_THEME_PRESETS.find((preset) => preset.id === 'engineering-grid')
    const bubbles = MIND_MAP_THEME_PRESETS.find((preset) => preset.id === 'teal-bubbles')

    expect(engineering?.appearance).toMatchObject({
      canvasBackground: 'grid',
      hierarchyLineStyle: 'orthogonal',
      hierarchyLinePattern: 'solid',
      nodeShape: 'square',
    })
    expect(bubbles?.appearance).toMatchObject({
      canvasBackground: 'plain',
      hierarchyLineColor: '#3F8078',
      nodeShape: 'pill',
    })
  })

  it('uses a textured paper background but keeps plain mode texture-free', () => {
    expect(mindMapCanvasBackgroundStyle('paper').backgroundImage).toContain('radial-gradient')
    expect(mindMapCanvasBackgroundStyle('plain')).toEqual({ backgroundColor: '#FBFAF7' })
  })
})
