import React, { FunctionComponent, ReactElement, useCallback, useEffect, useReducer, useState } from 'react'
import { CanvasPainter } from '../jscommon/CanvasWidget/CanvasPainter'
import { CanvasWidgetLayer } from "../jscommon/CanvasWidget/CanvasWidgetLayer"
import CanvasWidget from '../jscommon/CanvasWidget/CanvasWidgetNew'
import { createCursorLayer } from './cursorLayer'
import { createMainLayer } from './mainLayer'
import { createPanelLabelLayer } from './panelLabelLayer'
import Splitter from './Splitter'
import { createTimeAxisLayer } from './timeAxisLayer'
import TimeSpanWidget, { SpanWidgetInfo } from './TimeSpanWidget'
import TimeWidgetBottomBar, { BottomBarInfo } from './TimeWidgetBottomBar'
import { TimeWidgetLayerProps } from './TimeWidgetLayerProps'
import TimeWidgetToolbarNew from './TimeWidgetToolbarNew'

interface ActionItem {
    type: 'button'
    callback: () => void
    title: string
    icon: any
    keyCode: number
}
interface DividerItem {
    type: 'divider'
}

export type TimeWidgetAction = ActionItem | DividerItem

interface Props {
    panels: TimeWidgetPanel[]
    customActions: TimeWidgetAction[]
    width: number
    height: number
    samplerate: number
    maxTimeSpan: number
    startTimeSpan: number
    numTimepoints: number
    currentTime: number | null
    timeRange: {min: number, max: number} | null
    onCurrentTimeChanged: (t: number | null) => void
    onTimeRangeChanged: (tr: {min: number, max: number} | null) => void
}

export interface TimeWidgetPanel {
    setTimeRange: (timeRange: {min: number, max: number}) => void
    paint: (painter: CanvasPainter) => void
    label: () => string
    register: (onUpdate: () => void) => void
}

const toolbarWidth = 50
const spanWidgetHeight = 50

interface TimeState {
    numTimepoints: number
    maxTimeSpan: number
    currentTime: number | null
    timeRange: {min: number, max: number} | null
}
interface ZoomTimeRangeAction {
    type: 'zoomTimeRange'
    factor: number
}
interface SetTimeRangeAction {
    type: 'setTimeRange'
    timeRange: {min: number, max: number}
}
interface TimeShiftFrac {
    type: 'timeShiftFrac',
    frac: number
}
interface SetCurrentTime {
    type: 'setCurrentTime'
    currentTime: number
}
type TimeAction = ZoomTimeRangeAction | SetTimeRangeAction | TimeShiftFrac | SetCurrentTime | {type: 'gotoHome' | 'gotoEnd'}
const timeReducer = (state: TimeState, action: TimeAction): TimeState => {

    const fix = (s: TimeState): TimeState => {
        if (s.numTimepoints === null) return s
        let ret: TimeState = s
        if (ret.currentTime !== null) {
            if (ret.currentTime >= ret.numTimepoints) {
                ret = {
                    ...ret,
                    currentTime: ret.numTimepoints - 1
                }
            }
        }
        if (ret.currentTime !== null) {
            if (ret.currentTime < 0) {
                ret = {
                    ...ret,
                    currentTime: 0
                }
            }
        }
        if (ret.timeRange !== null) {
            if (ret.timeRange.max - ret.timeRange.min > ret.maxTimeSpan) {
                ret = {
                    ...ret,
                    timeRange: {min: ret.timeRange.min, max: ret.timeRange.min + ret.maxTimeSpan}
                }
            }
        }
        if (ret.timeRange !== null) {
            if (ret.timeRange.max > ret.numTimepoints) {
                const dt = ret.numTimepoints - ret.timeRange.max
                ret = {
                    ...ret,
                    timeRange: {min: ret.timeRange.min + dt, max: ret.timeRange.max + dt}
                }
            }
        }
        if (ret.timeRange !== null) {
            if (ret.timeRange.min < 0) {
                const dt = -ret.timeRange.min
                ret = {
                    ...ret,
                    timeRange: {min: ret.timeRange.min + dt, max: ret.timeRange.max + dt}
                }
            }
        }
        return ret
    }

    if (action.type === 'zoomTimeRange') {
        const currentTime = state.currentTime
        const timeRange = state.timeRange
        if (!timeRange) return state
        if ((timeRange.max - timeRange.min) / action.factor > state.maxTimeSpan ) return state
        let t: number
        if ((currentTime === null) || (currentTime < timeRange.min))
            t = timeRange.min
        else if (currentTime > timeRange.max)
            t = timeRange.max
        else
            t = currentTime
        const newTimeRange = zoomTimeRange(timeRange, action.factor, t)
        return fix({
            ...state,
            timeRange: newTimeRange
        })
    }
    else if (action.type === 'setTimeRange') {
        return fix({
            ...state,
            timeRange: action.timeRange
        })
    }
    else if (action.type === 'setCurrentTime') {
        return fix({
            ...state,
            currentTime: action.currentTime
        })
    }
    else if (action.type === 'timeShiftFrac') {
        const timeRange = state.timeRange
        const currentTime = state.currentTime
        if (!timeRange) return state
        const span = timeRange.max - timeRange.min
        const shift = Math.floor(span * action.frac)
        const newTimeRange = shiftTimeRange(timeRange, shift)
        const newCurrentTime = currentTime !== null ? currentTime + shift : null
        return fix({
            ...state,
            currentTime: newCurrentTime,
            timeRange: newTimeRange
        })
    }
    else if (action.type === 'gotoHome') {
        const timeRange = state.timeRange
        if (!timeRange) return state
        const span = timeRange.max - timeRange.min
        const newTimeRange = {min: 0, max: span}
        return fix({
            ...state,
            currentTime: newTimeRange.min,
            timeRange: newTimeRange
        })
    }
    else if (action.type === 'gotoEnd') {
        const timeRange = state.timeRange
        if (!timeRange) return state
        const numTimepoints = state.numTimepoints
        if (numTimepoints === null) return state
        const span = timeRange.max - timeRange.min
        const newTimeRange = {min: numTimepoints - span, max: numTimepoints}
        return fix({
            ...state,
            currentTime: newTimeRange.max - 1,
            timeRange: newTimeRange
        })
    }
    else {
        return state
    }
}

const TimeWidgetNew = (props: Props) => {

    const {panels, width, height, customActions, numTimepoints, maxTimeSpan, startTimeSpan, samplerate, onCurrentTimeChanged, onTimeRangeChanged} = props

    const [spanWidgetInfo, setSpanWidgetInfo] = useState<SpanWidgetInfo>({})
    const [bottomBarInfo, setBottomBarInfo] = useState<BottomBarInfo>({})
    const [bottomBarHeight, setBottomBarHeight] = useState(0)

    const [layers, setLayers] = useState<{[key: string]: CanvasWidgetLayer<TimeWidgetLayerProps, any>} | null>(null)
    const [layerList, setLayerList] = useState<CanvasWidgetLayer<TimeWidgetLayerProps, any>[] | null>(null)

    const [timeState, timeDispatch] = useReducer(timeReducer, {timeRange: null, currentTime: null, numTimepoints, maxTimeSpan})
    const [prevCurrentTime, setPrevCurrentTime] = useState<number | null>(null)
    const [prevTimeRange, setPrevTimeRange] = useState<{min: number, max: number} | null>(null)

    useEffect(() => {
        if (!layers) {
            const mainLayer = createMainLayer()
            const timeAxisLayer = createTimeAxisLayer()
            const panelLabelLayer = createPanelLabelLayer()
            const cursorLayer = createCursorLayer()
            
            setLayers({mainLayer, timeAxisLayer, panelLabelLayer, cursorLayer})
            setLayerList([mainLayer, timeAxisLayer, panelLabelLayer, cursorLayer])
        }
        panels.forEach(p => {
            p.register(() => {
                if (layers) {
                    layers.mainLayer.scheduleRepaint()
                }
            })
        })
        if (layers) {
            if (timeState.currentTime !== prevCurrentTime) {
                layers.cursorLayer.scheduleRepaint()
            }
            if (timeState.timeRange !== prevTimeRange) {
                Object.values(layers).forEach(layer => {
                    layer.scheduleRepaint()
                })
            }
        }
        setPrevCurrentTime(timeState.currentTime)
        setPrevTimeRange(timeState.timeRange)
    }, [layers, panels, timeState, prevCurrentTime, prevTimeRange, setPrevCurrentTime, setPrevTimeRange])

    const handleClick = useCallback(
        (args: {timepoint: number, panelIndex: number, y: number}) => {
            timeDispatch({type: 'setCurrentTime', currentTime: args.timepoint})
        },
        []
    )
    const handleDrag = useCallback(
        (args: {newTimeRange: {min: number, max: number}}) => {
            timeDispatch({type: 'setTimeRange', timeRange: args.newTimeRange})
        },
        [timeDispatch]
    )
    const handleTimeZoom = useCallback((factor: number) => {
        timeDispatch({type: 'zoomTimeRange', factor})
    }, [timeDispatch])

    const handleTimeShiftFrac = useCallback((frac: number) => {
        timeDispatch({type: 'timeShiftFrac', frac})
    }, [timeDispatch])

    const handleGotoHome = useCallback(() => {
        timeDispatch({type: 'gotoHome'})
    }, [timeDispatch])

    const handleGotoEnd = useCallback(() => {
        timeDispatch({type: 'gotoEnd'})
    }, [timeDispatch])

    const _zoomTime = (fac: number) => {
        timeDispatch({type: 'zoomTimeRange', factor: fac})
    }

    const _handleShiftTimeLeft = () => {
        timeDispatch({type: 'timeShiftFrac', frac: -0.2})
    }
    const _handleShiftTimeRight = () => {
        timeDispatch({type: 'timeShiftFrac', frac: 0.2})
    }

    useEffect(() => {
        const timeRange = timeState.timeRange
        if ((!timeRange) && (numTimepoints)) {
            const tmax = Math.min(startTimeSpan, numTimepoints)
            timeDispatch({type: 'setTimeRange', timeRange: {min: 0, max: tmax}})
            timeDispatch({type: 'setCurrentTime', currentTime: Math.floor(tmax / 2)})
        }
    }, [timeState, numTimepoints, startTimeSpan])

    const leftPanel = null

    const plotMargins = {
        left: 100,
        top: 50,
        right: 50,
        bottom: 100
    }

    if (!layerList) {
        return <div></div>
    }

    const innerContainer = (
        <InnerContainer>
            <TimeSpanWidget
                key='timespan'
                width={width}
                height={spanWidgetHeight}
                info={spanWidgetInfo}
                onCurrentTimeChanged={onCurrentTimeChanged}
                onTimeRangeChanged={onTimeRangeChanged}
            />
            <CanvasWidget<TimeWidgetLayerProps>
                key='canvas'
                layers={layerList}
                preventDefaultWheel={true}
                widgetProps={{
                    customActions,
                    panels,
                    width: width - toolbarWidth,
                    height: height - spanWidgetHeight - bottomBarHeight,
                    timeRange: timeState.timeRange,
                    currentTime: timeState.currentTime,
                    samplerate,
                    margins: plotMargins,
                    onClick: handleClick,
                    onDrag: handleDrag,
                    onTimeZoom: handleTimeZoom,
                    onTimeShiftFrac: handleTimeShiftFrac,
                    onGotoHome: handleGotoHome,
                    onGotoEnd: handleGotoEnd,
                }}
            />
            {/* <CanvasWidget
                
                layers={layers}
                width={this.props.width}
                height={this.props.height - this._spanWidgetHeight - this._bottomBarHeight}
                onMousePress={this.handle_mouse_press}
                onMouseRelease={this.handle_mouse_release}
                onMouseDrag={this.handle_mouse_drag}
                onMouseDragRelease={this.handle_mouse_drag_release}
                onKeyPress={this.handle_key_press}
                menuOpts={{exportSvg: true}}
            /> */}
            <TimeWidgetBottomBar
                key='bottom'
                width={width}
                height={bottomBarHeight}
                info={bottomBarInfo}
                onCurrentTimeChanged={onCurrentTimeChanged}
                onTimeRangeChanged={onTimeRangeChanged}
            />
        </InnerContainer>
    )

    return (
        <OuterContainer
            width={width}
            height={height}
        >
            <TimeWidgetToolbarNew
                width={toolbarWidth}
                height={height}
                top={spanWidgetHeight}
                onZoomIn={() => {_zoomTime(1.15)}}
                onZoomOut={() => {_zoomTime(1 / 1.15)}}
                onShiftTimeLeft={() => {_handleShiftTimeLeft()}}
                onShiftTimeRight={() => {_handleShiftTimeRight()}}
                customActions={customActions}
            />
            <Splitter
                width={width - toolbarWidth}
                height={height}
                left={toolbarWidth}
                onChange={() => {}}
            >
                {
                    leftPanel ? (
                        [leftPanel, innerContainer]
                    ) : (
                        innerContainer
                    )
                }
            </Splitter>
        </OuterContainer>
    );
}

const zoomTimeRange = (timeRange: {min: number, max: number}, factor: number, anchorTime: number): {min: number, max: number} => {
    const oldT1 = timeRange.min
    const oldT2 = timeRange.max
    const t1 = anchorTime + (oldT1 - anchorTime) / factor
    const t2 = anchorTime + (oldT2 - anchorTime) / factor
    return {min: Math.floor(t1), max: Math.floor(t2)}
}

const shiftTimeRange = (timeRange: {min: number, max: number}, shift: number): {min: number, max: number} => {
    return {
        min: Math.floor(timeRange.min + shift),
        max: Math.floor(timeRange.max + shift)
    }
}

interface InnerContainerProps {
    width?: number
    height?: number
    left?: number
}

const InnerContainer: FunctionComponent<InnerContainerProps> = (props) => {
    const style0 = {
        left: props.left || 0,
        top: 0,
        width: props.width,
        height: props.height
    }
    const ch = props.children as any as ReactElement[]
    return (
        <div className="innerContainer" style={{position: 'relative', ...style0}}>
            {
                ch.map((child, ii) => (
                    <child.type key={ii} {...child.props} width={props.width} />
                ))
            }
        </div>
    )
}

interface OuterContainerProps {
    width: number,
    height: number
}

const OuterContainer: FunctionComponent<OuterContainerProps> = (props) => {
    const style0 = {
        left: 0,
        top: 0,
        width: props.width,
        height: props.height
    }
    return (
        <div className="outerContainer" style={{position: 'relative', ...style0}}>
            {props.children}
        </div>
    )
}

export default TimeWidgetNew