import React from 'react'
import {
  Activity,
  ChevronDown,
  GitBranch,
  LayoutDashboard,
  Move,
  Palette,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import type { MindMapLayoutStrategy } from '../../types/document'
import type { MindMapAppearanceSettings } from '../../types/settings'
import {
  diagramTypeForStrategy,
  MIND_MAP_DIAGRAM_PRESETS,
  MIND_MAP_THEME_PRESETS,
  type MindMapDiagramType,
  strategyForDiagramType,
} from './mindMapVisualPresets'

export type MindMapMode = 'layout' | 'reorganize'

interface MindMapToolbarProps {
  mode: MindMapMode
  focused: boolean
  searchOpen: boolean
  experimentalLayoutEnabled: boolean
  strategy: MindMapLayoutStrategy
  appearance: MindMapAppearanceSettings
  onModeChange: (mode: MindMapMode) => void
  onStrategyChange: (strategy: MindMapLayoutStrategy) => void
  onAppearanceChange: (changes: Partial<MindMapAppearanceSettings>) => void
  onAutoLayout: () => void
  onForceDirectedPreview: () => void
  onToggleDiagnostics: () => void
  onToggleSearch: () => void
  onResetFocus: () => void
}

const backgroundOptions: Array<{ value: MindMapAppearanceSettings['canvasBackground']; label: string }> = [
  { value: 'paper', label: '纸张' },
  { value: 'dots', label: '点阵' },
  { value: 'grid', label: '网格' },
  { value: 'plain', label: '纯色' },
]

const lineOptions: Array<{ value: MindMapAppearanceSettings['hierarchyLineStyle']; label: string }> = [
  { value: 'curve', label: '曲线' },
  { value: 'orthogonal', label: '直角' },
  { value: 'straight', label: '直线' },
]

const linePatternOptions: Array<{ value: MindMapAppearanceSettings['hierarchyLinePattern']; label: string }> = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
]

const nodeShapeOptions: Array<{ value: MindMapAppearanceSettings['nodeShape']; label: string }> = [
  { value: 'rounded', label: '圆角' },
  { value: 'pill', label: '胶囊' },
  { value: 'square', label: '方框' },
]

const hierarchyColorSwatches = ['#9A755B', '#53728B', '#626262', '#3F8078', '#B17854', '#8A668F']

export const MindMapToolbar: React.FC<MindMapToolbarProps> = ({
  mode,
  focused,
  searchOpen,
  experimentalLayoutEnabled,
  strategy,
  appearance,
  onModeChange,
  onStrategyChange,
  onAppearanceChange,
  onAutoLayout,
  onForceDirectedPreview,
  onToggleDiagnostics,
  onToggleSearch,
  onResetFocus,
}) => {
  const [openPanel, setOpenPanel] = React.useState<'structure' | 'style' | null>(null)
  const activeDiagramType = diagramTypeForStrategy(strategy)
  const activePreset = MIND_MAP_DIAGRAM_PRESETS.find((preset) => preset.id === activeDiagramType)
  const activeStructureLabel = strategy === 'radial-mindmap'
    ? '径向'
    : strategy === 'free-canvas'
      ? '自由画布'
      : activePreset?.label ?? '逻辑图'
  const hasFormalDiagramType = MIND_MAP_DIAGRAM_PRESETS.some((preset) => preset.strategy === strategy)

  const selectDiagram = (type: MindMapDiagramType) => {
    setOpenPanel(null)
    onStrategyChange(strategyForDiagramType(type))
  }

  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-stone-300/55 bg-[#FFFCF7]/92 p-1.5 shadow-[0_10px_30px_rgba(74,55,38,0.09)] backdrop-blur-xl">
      <div className="flex items-center rounded-lg bg-stone-100/80 p-0.5">
        <button
          type="button"
          aria-label="布局"
          aria-pressed={mode === 'layout'}
          title="拖动调整布局"
          onClick={() => onModeChange('layout')}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
            mode === 'layout' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Move className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="重组"
          aria-pressed={mode === 'reorganize'}
          title="拖动调整父子结构"
          onClick={() => onModeChange('reorganize')}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
            mode === 'reorganize' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <GitBranch className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="结构类型"
          title="结构类型"
          onClick={() => setOpenPanel((current) => current === 'structure' ? null : 'structure')}
          className={`flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition ${
            openPanel === 'structure' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          {activeStructureLabel}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {openPanel === 'structure' && (
          <div className="absolute left-0 top-10 w-[430px] rounded-2xl border border-stone-200/80 bg-[#FFFDF9]/98 p-3 shadow-[0_18px_55px_rgba(74,55,38,0.16)] backdrop-blur-xl">
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">结构布局</div>
            <div className="grid grid-cols-2 gap-2">
              {MIND_MAP_DIAGRAM_PRESETS.map((preset) => {
                const active = hasFormalDiagramType && preset.id === activeDiagramType
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectDiagram(preset.id)}
                    className={`group rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                        : 'border-stone-200 bg-white/80 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <DiagramGlyph type={preset.id} active={active} />
                      <span className="text-xs font-semibold">{preset.label}</span>
                    </div>
                    <div className={`mt-1.5 text-[10px] leading-relaxed ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                      {preset.description}
                    </div>
                  </button>
                )
              })}
            </div>
            {experimentalLayoutEnabled && (
              <div className="mt-3 border-t border-stone-200 pt-3">
                <div className="mb-2 px-1 text-[10px] font-semibold text-stone-400">实验布局</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setOpenPanel(null); onStrategyChange('radial-mindmap') }} className="rounded-lg border border-stone-200 px-3 py-1.5 text-[11px] font-medium text-stone-600 hover:bg-stone-50">径向</button>
                  <button type="button" onClick={() => { setOpenPanel(null); onStrategyChange('free-canvas') }} className="rounded-lg border border-stone-200 px-3 py-1.5 text-[11px] font-medium text-stone-600 hover:bg-stone-50">自由画布</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="画布样式"
          title="画布样式"
          onClick={() => setOpenPanel((current) => current === 'style' ? null : 'style')}
          className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
            openPanel === 'style' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Palette className="h-3.5 w-3.5" />
          样式
        </button>
        {openPanel === 'style' && (
          <div className="absolute left-0 top-10 max-h-[72vh] w-[360px] overflow-y-auto rounded-2xl border border-stone-200/80 bg-[#FFFDF9]/98 p-3 shadow-[0_18px_55px_rgba(74,55,38,0.16)] backdrop-blur-xl">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">预设主题</div>
            <div className="grid grid-cols-2 gap-2">
              {MIND_MAP_THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={`主题：${preset.label}`}
                  onClick={() => onAppearanceChange(preset.appearance)}
                  className="rounded-xl border border-stone-200 bg-white/80 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-sm"
                >
                  <ThemePreview appearance={preset.appearance} />
                  <div className="mt-2 text-[11px] font-semibold text-stone-700">{preset.label}</div>
                  <div className="mt-0.5 text-[9px] leading-relaxed text-stone-400">{preset.description}</div>
                </button>
              ))}
            </div>
            <div className="my-3 h-px bg-stone-200/80" />
            <StyleOptionGroup
              label="画布背景"
              options={backgroundOptions}
              value={appearance.canvasBackground}
              onChange={(canvasBackground) => onAppearanceChange({ canvasBackground })}
            />
            <div className="my-3 h-px bg-stone-200/80" />
            <StyleOptionGroup
              label="层级连线"
              options={lineOptions}
              value={appearance.hierarchyLineStyle}
              onChange={(hierarchyLineStyle) => onAppearanceChange({ hierarchyLineStyle })}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StyleOptionGroup
                label="线型"
                options={linePatternOptions}
                value={appearance.hierarchyLinePattern}
                onChange={(hierarchyLinePattern) => onAppearanceChange({ hierarchyLinePattern })}
              />
              <StyleOptionGroup
                label="节点形状"
                options={nodeShapeOptions}
                value={appearance.nodeShape}
                onChange={(nodeShape) => onAppearanceChange({ nodeShape })}
              />
            </div>
            <div className="mt-3">
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">层级线颜色</div>
              <div className="flex items-center gap-2 rounded-xl bg-stone-100/80 p-2">
                {hierarchyColorSwatches.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`层级线颜色 ${color}`}
                    onClick={() => onAppearanceChange({ hierarchyLineColor: color })}
                    className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                      appearance.hierarchyLineColor.toLowerCase() === color.toLowerCase()
                        ? 'border-stone-900 ring-2 ring-white'
                        : 'border-white shadow-sm'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <label className="ml-auto flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-[9px] font-semibold text-stone-500 shadow-sm">
                  自定义
                  <input
                    aria-label="自定义层级线颜色"
                    type="color"
                    value={appearance.hierarchyLineColor}
                    onChange={(event) => onAppearanceChange({ hierarchyLineColor: event.target.value.toUpperCase() })}
                    className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-teal-50 px-2.5 py-2 text-[10px] leading-relaxed text-teal-700">
              语义关系线继续使用青绿色独立样式，和层级结构线保持视觉区分。
            </div>
          </div>
        )}
      </div>

      <button type="button" aria-label="自动整理" title="按当前结构重新排版" onClick={onAutoLayout} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800">
        <Sparkles className="h-4 w-4" />
      </button>

      {experimentalLayoutEnabled && (
        <>
          <button type="button" aria-label="力导向预览" title="力导向预览" onClick={onForceDirectedPreview} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800">
            <Activity className="h-4 w-4" />
          </button>
          <button type="button" aria-label="布局诊断" title="布局诊断" onClick={onToggleDiagnostics} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800">
            <LayoutDashboard className="h-4 w-4" />
          </button>
        </>
      )}

      <button
        type="button"
        aria-label="搜索导图"
        title="搜索导图"
        onClick={onToggleSearch}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${searchOpen ? 'bg-sky-100 text-sky-800' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'}`}
      >
        <Search className="h-4 w-4" />
      </button>
      {focused && (
        <button type="button" aria-label="回到全图" title="回到全图" onClick={onResetFocus} className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700 transition hover:bg-stone-200">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function DiagramGlyph({ type, active }: { type: MindMapDiagramType; active: boolean }) {
  const line = active ? 'bg-stone-300' : 'bg-stone-300'
  const node = active ? 'border-stone-300 bg-stone-800' : 'border-stone-300 bg-white'
  if (type === 'timeline') {
    return (
      <div className="relative h-7 w-10 shrink-0">
        <div className={`absolute left-1 right-1 top-3 h-px ${line}`} />
        {[4, 18, 32].map((left) => <div key={left} className={`absolute top-[9px] h-2 w-2 rounded-full border ${node}`} style={{ left }} />)}
      </div>
    )
  }
  if (type === 'mindmap') {
    return (
      <div className="relative h-7 w-10 shrink-0">
        <div className={`absolute left-[17px] top-[9px] h-2.5 w-2.5 rounded-full border ${node}`} />
        <div className={`absolute left-1 top-1 h-2 w-2 rounded border ${node}`} />
        <div className={`absolute left-1 top-5 h-2 w-2 rounded border ${node}`} />
        <div className={`absolute right-1 top-1 h-2 w-2 rounded border ${node}`} />
        <div className={`absolute right-1 top-5 h-2 w-2 rounded border ${node}`} />
      </div>
    )
  }
  if (type === 'logic') {
    return (
      <div className="relative h-7 w-10 shrink-0">
        <div className={`absolute left-0 top-[9px] h-2.5 w-2.5 rounded border ${node}`} />
        <div className={`absolute left-[10px] top-[13px] h-px w-3 ${line}`} />
        <div className={`absolute left-[21px] top-[5px] h-4 w-px ${line}`} />
        <div className={`absolute right-0 top-1 h-2 w-2 rounded border ${node}`} />
        <div className={`absolute right-0 top-5 h-2 w-2 rounded border ${node}`} />
        <div className={`absolute left-[21px] right-[7px] top-[5px] h-px ${line}`} />
        <div className={`absolute left-[21px] right-[7px] top-[21px] h-px ${line}`} />
      </div>
    )
  }
  if (type === 'org') {
    return (
      <div className="relative h-7 w-10 shrink-0">
        <div className={`absolute left-[15px] top-0 h-2.5 w-3 rounded border ${node}`} />
        <div className={`absolute left-[20px] top-2 h-2 w-px ${line}`} />
        <div className={`absolute left-[4px] right-[4px] top-[15px] h-px ${line}`} />
        {[1, 16, 31].map((left) => <div key={left} className={`absolute top-[18px] h-2 w-2 rounded border ${node}`} style={{ left }} />)}
      </div>
    )
  }
  return (
    <div className="relative h-7 w-10 shrink-0">
      <div className={`absolute left-[16px] top-0 h-2.5 w-2.5 rounded border ${node}`} />
      <div className={`absolute left-1 top-5 h-2 w-2 rounded border ${node}`} />
      <div className={`absolute right-1 top-5 h-2 w-2 rounded border ${node}`} />
      <div className={`absolute left-[20px] top-2 h-3 w-px ${line}`} />
      <div className={`absolute left-[5px] right-[5px] top-4 h-px ${line}`} />
    </div>
  )
}

function StyleOptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div>
      <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">{label}</div>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-stone-100/80 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold transition ${
              option.value === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ThemePreview({ appearance }: { appearance: MindMapAppearanceSettings }) {
  const radius = appearance.nodeShape === 'pill' ? 999 : appearance.nodeShape === 'square' ? 3 : 8
  const lineStyle = appearance.hierarchyLinePattern === 'dashed' ? 'dashed' : 'solid'

  return (
    <div
      className="relative h-12 overflow-hidden rounded-lg border border-stone-200/80"
      style={{
        backgroundColor: appearance.canvasBackground === 'paper' ? '#FBF8F1' : '#FBFAF7',
        backgroundImage: appearance.canvasBackground === 'grid'
          ? 'linear-gradient(#DDD8D0 1px, transparent 1px), linear-gradient(90deg, #DDD8D0 1px, transparent 1px)'
          : appearance.canvasBackground === 'dots'
            ? 'radial-gradient(#C8BEB1 1px, transparent 1px)'
            : undefined,
        backgroundSize: appearance.canvasBackground === 'grid' ? '12px 12px' : appearance.canvasBackground === 'dots' ? '10px 10px' : undefined,
      }}
    >
      <div
        className="absolute left-[22px] top-[23px] h-0 w-[52px] border-t-2"
        style={{ borderColor: appearance.hierarchyLineColor, borderTopStyle: lineStyle }}
      />
      <div
        className="absolute left-2 top-[15px] h-4 w-8 border"
        style={{ borderColor: appearance.nodeBorderColor, backgroundColor: appearance.nodeFillColor, borderRadius: radius }}
      />
      <div
        className="absolute right-2 top-[15px] h-4 w-8 border"
        style={{ borderColor: appearance.nodeBorderColor, backgroundColor: appearance.nodeFillColor, borderRadius: radius }}
      />
    </div>
  )
}
