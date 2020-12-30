import React, { FunctionComponent, useEffect, useReducer, useState } from 'react'
import CanvasWidget from "../../common/CanvasWidget"
import { useLayer, useLayers } from "../../common/CanvasWidget/CanvasWidgetLayer"
import { createElectrodeGeometryLayer, ElectrodeLayerProps } from "../../electrodegeometry/ElectrodeGeometryWidget/electrodeGeometryLayer"
import { SortingSelection } from "../../extensionInterface"
import { TimeseriesData } from "../../timeseries/TimeseriesViewNew/useTimeseriesModel"

const updateIndexReducer = (state: number, action: {type: 'increment'}) => {
    return state + 1
}


// this is duplicate code
const zipElectrodes = (locations: number[][], ids: number[]) => {
    if (locations && ids && ids.length !== locations.length) throw Error('Electrode ID count does not match location count.')
    return ids.map((x, index) => {
        const loc = locations[index]
        return { label: x + '', x: loc[0], y: loc[1], electrodeId: x }
    })
}

const valToColor = (v: number) => {
    if (v <= 0) return 'black'
    if (v >= 1) return 'white'
    const x = Math.floor(v * 255)
    return `rgb(${x}, ${x}, ${x})`
}

const FireTrackWidget: FunctionComponent<{recording: any, timeseriesData: TimeseriesData | null, selection: SortingSelection, width: number, height: number}> = ({ recording, timeseriesData, selection, width, height }) => {
    const selectedElectrodeIds = selection.selectedElectrodeIds
    const [data, setData] = useState<{[key: string]: number}>({})
    const [updateIndex, updateIndexDispatch] = useReducer(updateIndexReducer, 0)
    const recordingInfo = recording.recordingInfo

    useEffect(() => {
        const t = selection.currentTimepoint
        if ((t === undefined) || (!selectedElectrodeIds) || (!timeseriesData)) {
            setData({})
            return
        }
        const d: {[key: string]: number} = {}
        for (let eid of selectedElectrodeIds) {
            const x = timeseriesData.getChannelData(eid, Math.floor(t), Math.floor(t) + 1, 1)
            d[eid + ''] = x[0]
        }
        setData(d)
        const somethingMissing = (Object.values(d).filter(v => isNaN(v)).length > 0)
        if (somethingMissing) {
            setTimeout(() => {
                updateIndexDispatch({type: 'increment'})
            }, 500)
        }
    }, [timeseriesData, selection, selectedElectrodeIds, setData, updateIndex, updateIndexDispatch])

    const scaleFactor = (selection.ampScaleFactor || 1) / (recordingInfo.noise_level || 1) * 1 / 5

    const colorForElectrode = (id: number) => {
        const val = data[id]
        if (isNaN(val)) return 'lightgray'
        const adjustedVal = - val * scaleFactor
        return valToColor(adjustedVal)
    }

    const ri = recording.recordingInfo
    const electrodes = (ri ? zipElectrodes(ri.geom, ri.channel_ids) : []).map(e => ({...e, color: colorForElectrode(e.electrodeId)}))
    const layerProps: ElectrodeLayerProps = {
        electrodes,
        selectedElectrodeIds: selection.selectedElectrodeIds || [],
        onSelectedElectrodeIdsChanged: (x: number[]) => {},
        width,
        height
    }
    const layer = useLayer(createElectrodeGeometryLayer, layerProps)
    const layers = useLayers([layer])
    return (
        <CanvasWidget
            layers={layers}
            {...{width, height}}
        />
    )
}

export default FireTrackWidget