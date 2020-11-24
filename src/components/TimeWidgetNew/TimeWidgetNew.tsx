import React, { FunctionComponent, ReactElement, useCallback, useEffect, useState } from 'react'
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
    key: number
}
interface DividerItem {
    type: 'divider'
}

export type TimeWidgetAction = ActionItem | DividerItem

interface Props {
    panels: TimeWidgetPanel[]
    actions: TimeWidgetAction[]
    width: number
    height: number
    samplerate: number
    maxTimeSpan: number
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

const TimeWidgetNew = (props: Props) => {

    const {panels, width, height, actions, numTimepoints, maxTimeSpan, samplerate, onCurrentTimeChanged, onTimeRangeChanged} = props

    const [spanWidgetInfo, setSpanWidgetInfo] = useState<SpanWidgetInfo>({})
    const [bottomBarInfo, setBottomBarInfo] = useState<BottomBarInfo>({})
    const [bottomBarHeight, setBottomBarHeight] = useState(0)
    const [currentTime, setCurrentTime] = useState<number | null>(null)
    const [timeRange, setTimeRange] = useState<{min: number, max: number} | null>(null)

    const [layers, setLayers] = useState<{[key: string]: CanvasWidgetLayer<TimeWidgetLayerProps, any>} | null>(null)
    const [layerList, setLayerList] = useState<CanvasWidgetLayer<TimeWidgetLayerProps, any>[] | null>(null)

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
            if (currentTime !== prevCurrentTime) {
                layers.cursorLayer.scheduleRepaint()
            }
            if (timeRange !== prevTimeRange) {
                Object.values(layers).forEach(layer => {
                    layer.scheduleRepaint()
                })
            }
        }
        setPrevCurrentTime(currentTime)
        setPrevTimeRange(timeRange)
    }, [layers, panels, currentTime, timeRange, prevCurrentTime, prevTimeRange, setPrevCurrentTime, setPrevTimeRange])

    const handleClick = useCallback(
        (args: {timepoint: number, panelIndex: number, y: number}) => {
            console.log(args)
            setCurrentTime(args.timepoint)
        },
        []
    )
    const handleDrag = useCallback(
        (args: {newTimeRange: {min: number, max: number}}) => {
            if (timeRange) {
                setTimeRange(args.newTimeRange)
            }
        },
        [timeRange, layers]
    )

    const _zoomTime = (fac: number) => {
        if (timeRange) {
            let t: number
            if ((currentTime === null) || (currentTime < timeRange.min))
                t = timeRange.min
            else if (currentTime > timeRange.max)
                t = timeRange.max
            else
                t = currentTime
            const newTimeRange = zoomTimeRange(timeRange, fac, t)
            setTimeRange(newTimeRange)
        }
    }

    const _handleShiftTimeLeft = () => {
        if (timeRange) {
            const span = timeRange.max - timeRange.min
            const newTimeRange = shiftTimeRange(timeRange, -span * 0.2)
            setTimeRange(newTimeRange)
        }
    }
    const _handleShiftTimeRight = () => {
        if (timeRange) {
            const span = timeRange.max - timeRange.min
            const newTimeRange = shiftTimeRange(timeRange, +span * 0.2)
            setTimeRange(newTimeRange)
        }
    }

    useEffect(() => {
        if ((!timeRange) && (numTimepoints)) {
            // const tmax = Math.min(maxTimeSpan, numTimepoints)
            const tmax = 9000
            setTimeRange({
                min: 0,
                max: tmax
            })
            setCurrentTime( tmax / 2 )
        }
    }, [timeRange, numTimepoints])

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
                widgetProps={{
                    panels,
                    width: width - toolbarWidth,
                    height: height - spanWidgetHeight - bottomBarHeight,
                    timeRange,
                    currentTime,
                    samplerate,
                    margins: plotMargins,
                    onClick: handleClick,
                    onDrag: handleDrag
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
                customActions={actions}
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