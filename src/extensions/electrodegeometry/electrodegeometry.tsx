// LABBOX-EXTENSION: electrodegeometry
// LABBOX-EXTENSION-TAGS: jupyter

import GrainIcon from '@material-ui/icons/Grain';
import React, { FunctionComponent, useCallback, useMemo } from 'react';
import { useRecordingInfo } from '../common/getRecordingInfo';
import { ExtensionContext, RecordingViewProps, SortingViewProps } from "../extensionInterface";
import ElectrodeGeometryWidget from './ElectrodeGeometryWidget/ElectrodeGeometryWidget';

const zipElectrodes = (locations: number[][], ids: number[]) => {
    if (locations && ids && ids.length !== locations.length) throw Error('Electrode ID count does not match location count.')
    return ids.map((x, index) => {
        const loc = locations[index]
        return { label: x + '', id: x, x: loc[0], y: loc[1] }
    })
}

const ElectrodeGeometryRecordingView: FunctionComponent<RecordingViewProps> = ({recording, width, height, recordingSelection, recordingSelectionDispatch}) => {
    const ri = useRecordingInfo(recording.recordingObject)
    const visibleElectrodeIds = recordingSelection.visibleElectrodeIds
    const electrodes = useMemo(() => (ri ? zipElectrodes(ri.geom, ri.channel_ids) : []).filter(a => ((!visibleElectrodeIds) || (visibleElectrodeIds.includes(a.id)))), [ri, visibleElectrodeIds])

    const handleSelectedElectrodeIdsChanged = useCallback((x: number[]) => {
        recordingSelectionDispatch({type: 'SetSelectedElectrodeIds', selectedElectrodeIds: x})
    }, [recordingSelectionDispatch])

    const selectedElectrodeIds = useMemo(() => (recordingSelection.selectedElectrodeIds || []), [recordingSelection.selectedElectrodeIds])

    // const [selectedElectrodeIds, setSelectedElectrodeIds] = useState<number[]>([]);
    if (!ri) {
        return (
            <div>No recording info found for recording.</div>
        )
    }
    return (
        <ElectrodeGeometryWidget
            electrodes={electrodes}
            selectedElectrodeIds={selectedElectrodeIds}
            onSelectedElectrodeIdsChanged={handleSelectedElectrodeIdsChanged}
            width={width || 350}
            height={height || 150}
        />
    );
}

const ElectrodeGeometrySortingView: FunctionComponent<SortingViewProps> = ({recording, recordingInfo, plugins, calculationPool, width, height, selection, selectionDispatch}) => {
    return (
        <ElectrodeGeometryRecordingView
            {...{recording, recordingInfo, plugins, calculationPool, width, height, recordingSelection: selection, recordingSelectionDispatch: selectionDispatch}}
        />
    )
}

export function activate(context: ExtensionContext) {
    context.registerRecordingView({
        name: 'ElectrodeGeometryRecordingView',
        label: 'Electrode geometry',
        priority: 50,
        defaultExpanded: false,
        component: ElectrodeGeometryRecordingView,
        singleton: true,
        icon: <GrainIcon />
    })
    context.registerSortingView({
        name: 'ElectrodeGeometrySortingView',
        label: 'Electrode geometry',
        priority: 50,
        component: ElectrodeGeometrySortingView,
        singleton: true,
        icon: <GrainIcon />
    })
}