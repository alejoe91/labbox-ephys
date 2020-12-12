import { CanvasPainter } from '../../CanvasWidget/CanvasPainter';
import { CanvasDragEvent, CanvasWidgetLayer, ClickEvent, ClickEventType, DiscreteMouseEventHandler, DragHandler } from "../../CanvasWidget/CanvasWidgetLayer";
import { pointIsInEllipse, RectangularRegion, rectangularRegionsIntersect } from '../../CanvasWidget/Geometry';
import { LayerProps } from './AverageWaveformWidget';
import setupElectrodes, { ElectrodeBox } from './setupElectrodes';

export type ElectrodeColors = {
    border: string,
    base: string,
    selected: string,
    hover: string,
    selectedHover: string,
    dragged: string,
    draggedSelected: string,
    dragRect: string,
    textLight: string,
    textDark: string
}
type LayerState = {
    electrodeBoxes: ElectrodeBox[]
    radius: number
    pixelRadius: number
    dragRegion: RectangularRegion | null
    draggedElectrodeIds: number[]
    hoveredElectrodeId: number | null
}
const initialLayerState = {
    electrodeBoxes: [],
    radius: 0,
    pixelRadius: 0,
    dragRegion: null,
    draggedElectrodeIds: [],
    hoveredElectrodeId: null
}

const defaultColors: ElectrodeColors = {
    border: 'rgb(30, 30, 30)',
    base: 'rgb(0, 0, 255)',
    selected: 'rgb(196, 196, 128)',
    hover: 'rgb(128, 128, 255)',
    selectedHover: 'rgb(200, 200, 196)',
    dragged: 'rgb(0, 0, 196)',
    draggedSelected: 'rgb(180, 180, 150)',
    dragRect: 'rgba(196, 196, 196, 0.5)',
    textLight: 'rgb(228, 228, 228)',
    textDark: 'rgb(32, 32, 32)'
}

const handleClick: DiscreteMouseEventHandler = (event: ClickEvent, layer: CanvasWidgetLayer<LayerProps, LayerState>) => {
    if (event.type !== ClickEventType.Release) return
    const { onSelectedElectrodeIdsChanged } = layer.getProps()
    const state = layer.getState()
    if (state === null) return
    const hitIds = state.electrodeBoxes.filter((r) => pointIsInEllipse(event.point, [r.x, r.y], state.radius)).map(r => r.id)
    // handle clicks that weren't on an electrode
    if (hitIds.length === 0) {
        if (!(event.modifiers.ctrl || event.modifiers.shift || state.dragRegion)) {
            // simple-click that doesn't select anything should deselect everything. Shift- or Ctrl-clicks on empty space do nothing.
            onSelectedElectrodeIdsChanged && onSelectedElectrodeIdsChanged([])
        }
        return
    }
    // Our definition of radius precludes any two electrodes from overlapping, so hitIds should have 0 or 1 elements.
    // Since we've already handled the case where it's 0, now it must be 1.
    const hitId = hitIds[0]
    
    const currentSelection = layer.getProps()?.selectedElectrodeIds || []
    const newSelection = event.modifiers.ctrl  // ctrl-click: toggle state of clicked item
                            ? currentSelection.includes(hitId)
                                ? currentSelection.filter(id => id !== hitId)
                                : [...currentSelection, hitId]
                            : event.modifiers.shift
                                ? [...currentSelection, hitId] // shift-click: add selected item unconditionally
                                : [hitId] // simple click: clear all selections except clicked item
    onSelectedElectrodeIdsChanged && onSelectedElectrodeIdsChanged(newSelection)
    layer.scheduleRepaint()
}

const handleHover: DiscreteMouseEventHandler = (event: ClickEvent, layer: CanvasWidgetLayer<LayerProps, LayerState>) => {
    if (event.type !== ClickEventType.Move) return
    const state = layer.getState()
    if (state === null) return
    const hoveredIds = state.electrodeBoxes.filter((r) => pointIsInEllipse(event.point, [r.x, r.y], state.radius)).map(r => r.id)
    layer.setState({...state, hoveredElectrodeId: hoveredIds.length === 0 ? null : hoveredIds[0]})
    layer.scheduleRepaint()
}

const handleDragSelect: DragHandler = (layer: CanvasWidgetLayer<LayerProps, LayerState>, drag: CanvasDragEvent) => {
    const state = layer.getState()
    const { onSelectedElectrodeIdsChanged } = layer.getProps()
    if (state === null) return // state not set; can't happen but keeps linter happy
    const hits = state.electrodeBoxes.filter((r) => rectangularRegionsIntersect(r.rect, drag.dragRect)) ?? []
    if (drag.released) {
        const currentSelected = drag.shift ? layer.getProps()?.selectedElectrodeIds ?? [] : []
        onSelectedElectrodeIdsChanged && onSelectedElectrodeIdsChanged([...currentSelected, ...hits.map(r => r.id)])
        layer.setState({...state, dragRegion: null, draggedElectrodeIds: []})
    } else {
        layer.setState({...state, dragRegion: drag.dragRect, draggedElectrodeIds: hits.map(r => r.id)})
    }
    layer.scheduleRepaint()
}

export const createElectrodesLayer = () => {
    const onPaint = (painter: CanvasPainter, props: LayerProps, state: LayerState) => {
        const opts = props.electrodeOpts
        const colors = opts.colors || defaultColors
        const showLabels = opts.showLabels
        painter.wipe()
        const useLabels = state.pixelRadius > 5
        for (let e of state.electrodeBoxes) {
            const selected = props.selectedElectrodeIds?.includes(e.id) || false
            const hovered = state.hoveredElectrodeId === e.id
            const dragged = state.draggedElectrodeIds?.includes(e.id) || false
            const color = selected 
                            ? dragged
                                ? colors.draggedSelected
                                : hovered
                                    ? colors.selectedHover
                                    : colors.selectedHover
                            : dragged
                                ? colors.dragged
                                : hovered
                                    ? colors.hover
                                    : colors.base
            painter.fillEllipse(e.rect, {color: color})
            painter.drawEllipse(e.rect, {color: colors.border})
            if (useLabels) {
                const fontColor = ([colors.selected, colors.draggedSelected, colors.hover, colors.selectedHover].includes(color)) ? colors.textDark : colors.textLight
                if (showLabels) {
                    painter.drawText(e.rect, 
                        {Horizontal: 'AlignCenter', Vertical: 'AlignCenter'}, 
                        {pixelSize: state.pixelRadius, family: 'Arial'},
                        {color: fontColor}, {color: fontColor},
                        e.label)
                }
            }
        }
        
        state.dragRegion && painter.fillRect(state.dragRegion, {color: colors.dragRect})
    }
    const onPropsChange = (layer: CanvasWidgetLayer<LayerProps, LayerState>, props: LayerProps) => {
        const state = layer.getState()
        const { width, height, electrodeLocations, electrodeIds } = props
        const { electrodeBoxes, transform, radius, pixelRadius } = setupElectrodes({width, height, electrodeLocations, electrodeIds})
        layer.setTransformMatrix(transform)
        layer.setState({...state, electrodeBoxes, radius, pixelRadius})
        layer.scheduleRepaint()
    }
    return new CanvasWidgetLayer<LayerProps, LayerState>(
        onPaint,
        onPropsChange,
        initialLayerState,
        {
            discreteMouseEventHandlers: [handleClick, handleHover],
            dragHandlers: [handleDragSelect],
        }
    )
}