import { CircularProgress } from '@material-ui/core';
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
<<<<<<< 13373a8a30be1f9ea678e7f96755fb69949fe6b4
import React, { FunctionComponent, useCallback, useMemo } from 'react';
import { WorkspaceInfo } from '../AppContainer';
=======
import React, { FunctionComponent, useContext, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getRecordingInfo } from '../actions/getRecordingInfo';
>>>>>>> add WorspaceView
import NiceTable from '../components/NiceTable';
<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
import { useRecordingInfos } from '../extensions/common/getRecordingInfo';
import { Recording, RecordingInfo } from '../reducers/recordings';
import { Sorting, SortingInfo } from '../reducers/sortings';
import { WorkspaceRouteDispatch } from './WorkspaceView';
import './WorkspaceView.css';

interface Props {
    workspaceInfo: WorkspaceInfo
    recordings: Recording[]
    sortings: Sorting[]
    onDeleteRecordings: (recordingIds: string[]) => void
    workspaceRouteDispatch: WorkspaceRouteDispatch
=======
import { HitherContext } from '../extensions/common/hither';
import { getPathQuery } from '../kachery';
=======
import React, { FunctionComponent, useCallback, useMemo } from 'react';
import { WorkspaceInfo } from '../AppContainer';
import NiceTable from '../components/NiceTable';
<<<<<<< 8b5ea1ca1a2be14685dd7e844b3ef682a6e48e34
>>>>>>> workspace view and simplified state flow
=======
import { useRecordingInfos } from '../extensions/common/getRecordingInfo';
>>>>>>> misc fixes
import { Recording, RecordingInfo } from '../reducers/recordings';
import { Sorting, SortingInfo } from '../reducers/sortings';
import { WorkspaceRouteDispatch } from './WorkspaceView';
import './WorkspaceView.css';

interface Props {
    workspaceInfo: WorkspaceInfo
<<<<<<< 13373a8a30be1f9ea678e7f96755fb69949fe6b4
>>>>>>> import recordings view python scripts
}

const sortingElement = (sorting: Sorting, sortingInfo?: SortingInfo) => {
    return <span key={sorting.sortingId}>{sorting.sortingId} ({sortingInfo ? sortingInfo.unit_ids.length : ''})</span>
}

const sortingsElement = (sortings: Sorting[]) => {
    return (
        <span>
            {
                sortings.map(s => (
                    sortingElement(s)
                ))
            }
        </span>
    )
}

const RecordingsTable: FunctionComponent<Props> = ({ recordings, sortings, onDeleteRecordings, workspaceInfo, workspaceRouteDispatch }) => {
    const { readOnly } = workspaceInfo;

<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
    const sortingsByRecordingId: {[key: string]: Sorting[]} = useMemo(() => {
        const ret: {[key: string]: Sorting[]} = {}
        recordings.forEach(r => {
            ret[r.recordingId] = sortings.filter(s => (s.recordingId === r.recordingId))
        })
        return ret
    }, [recordings, sortings])
=======
const RecordingsTable: FunctionComponent<Props> = ({ recordings, onDeleteRecordings, onSetRecordingInfo, workspaceInfo }) => {
=======
    recordings: Recording[]
    sortings: Sorting[]
    onDeleteRecordings: (recordingIds: string[]) => void
    workspaceRouteDispatch: WorkspaceRouteDispatch
}

const sortingElement = (sorting: Sorting, sortingInfo?: SortingInfo) => {
    return <span key={sorting.sortingId}>{sorting.sortingId} ({sortingInfo ? sortingInfo.unit_ids.length : ''})</span>
}

const sortingsElement = (sortings: Sorting[]) => {
    return (
        <span>
            {
                sortings.map(s => (
                    sortingElement(s)
                ))
            }
        </span>
    )
}

<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
const RecordingsTable: FunctionComponent<Props> = ({ recordings, sortings, onDeleteRecordings, onSetRecordingInfo, workspaceInfo }) => {
>>>>>>> add WorspaceView
    const hither = useContext(HitherContext)
    const { workspaceName, feedUri, readOnly } = workspaceInfo;
>>>>>>> import recordings view python scripts
=======
const RecordingsTable: FunctionComponent<Props> = ({ recordings, sortings, onDeleteRecordings, workspaceInfo, workspaceRouteDispatch }) => {
    const { readOnly } = workspaceInfo;
>>>>>>> workspace view and simplified state flow

    const sortingsByRecordingId: {[key: string]: Sorting[]} = useMemo(() => {
        const ret: {[key: string]: Sorting[]} = {}
        recordings.forEach(r => {
            ret[r.recordingId] = sortings.filter(s => (s.recordingId === r.recordingId))
        })
        return ret
    }, [recordings, sortings])

    function sortByKey<T extends {[key: string]: any}>(array: T[], key: string): T[] {
        return array.sort(function (a, b) {
            var x = a[key]; var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    }

    recordings = sortByKey(recordings, 'recordingLabel');

    const handleViewRecording = useCallback((recording: Recording) => {
        workspaceRouteDispatch({
            type: 'gotoRecordingPage',
            recordingId: recording.recordingId
        })
    }, [workspaceRouteDispatch])
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3

<<<<<<< 13373a8a30be1f9ea678e7f96755fb69949fe6b4
    const recordingInfos: {[key: string]: RecordingInfo} = useRecordingInfos(recordings)

<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
=======

    const recordingInfos: {[key: string]: RecordingInfo} = useRecordingInfos(recordings)

>>>>>>> workspace view and simplified state flow
    const rows = useMemo(() => (recordings.map(rec => {
        const recordingInfo = recordingInfos[rec.recordingId]
        return {
            key: rec.recordingId,
            columnValues: {
                recording: rec,
                recordingLabel: {
                    text: rec.recordingLabel,
                    element: <ViewRecordingLink onClick={handleViewRecording} recording={rec} />,
                },
                numChannels: recordingInfo ? recordingInfo.channel_ids.length : {element: <CircularProgress />},
                samplingFrequency: recordingInfo ? recordingInfo.sampling_frequency : '',
                durationMinutes: recordingInfo ? recordingInfo.num_frames / recordingInfo.sampling_frequency / 60 : '',
                sortings: { element: sortingsElement(sortingsByRecordingId[rec.recordingId]) }
            }
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
=======
    const rows = recordings.map(rec => ({
=======
    const rows = useMemo(() => (recordings.map(rec => ({
>>>>>>> add WorspaceView
        key: rec.recordingId,
        columnValues: {
            recording: rec,
            recordingLabel: {
                text: rec.recordingLabel,
                element: <Link title={"View this recording"} to={`/${workspaceName}/recording/${rec.recordingId}${getPathQuery({feedUri})}`}>{rec.recordingLabel}</Link>,
            },
            numChannels: rec.recordingInfo ? rec.recordingInfo.channel_ids.length : {element: <CircularProgress />},
            samplingFrequency: rec.recordingInfo ? rec.recordingInfo.sampling_frequency : '',
<<<<<<< 13373a8a30be1f9ea678e7f96755fb69949fe6b4
            durationMinutes: rec.recordingInfo ? rec.recordingInfo.num_frames / rec.recordingInfo.sampling_frequency / 60 : ''
>>>>>>> import recordings view python scripts
        }
    })), [recordings, sortingsByRecordingId, handleViewRecording, recordingInfos])
=======
            durationMinutes: rec.recordingInfo ? rec.recordingInfo.num_frames / rec.recordingInfo.sampling_frequency / 60 : '',
            sortings: { element: sortingsElement(sortingsByRecordingId[rec.recordingId]) }
        }
    }))), [recordings, sortingsByRecordingId, feedUri, workspaceName])
>>>>>>> add WorspaceView
=======
        }
    })), [recordings, sortingsByRecordingId, handleViewRecording, recordingInfos])
>>>>>>> workspace view and simplified state flow

    const columns = [
        {
            key: 'recordingLabel',
            label: 'Recording'
        },
        {
            key: 'numChannels',
            label: 'Num. channels'
        },
        {
            key: 'samplingFrequency',
            label: 'Samp. freq. (Hz)'
        },
        {
            key: 'durationMinutes',
            label: 'Duration (min)'
        },
        {
            key: 'sortings',
            label: 'Sortings'
        }
    ]

    return (
        <div>
            <NiceTable
                rows={rows}
                columns={columns}
                deleteRowLabel={"Remove this recording"}
                onDeleteRow={readOnly ? undefined : (key, columnValues) => onDeleteRecordings([key])}
            />
        </div>
    );
}

<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
<<<<<<< 13373a8a30be1f9ea678e7f96755fb69949fe6b4
<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
=======
>>>>>>> workspace view and simplified state flow
const ViewRecordingLink: FunctionComponent<{recording: Recording, onClick: (r: Recording) => void}> = ({recording, onClick}) => {
    const handleClick = useCallback(() => {
        onClick(recording)
    }, [recording, onClick])
    return (
        <Anchor title="View recording" onClick={handleClick}>{recording.recordingLabel}</Anchor>
    )
}

const Anchor: FunctionComponent<{title: string, onClick: () => void}> = ({title, children, onClick}) => {
    return (
        <button type="button" className="link-button" onClick={onClick}>{children}</button>
    )
}
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
=======
const mapStateToProps: MapStateToProps<StateProps, OwnProps, RootState> = (state: RootState, ownProps: OwnProps): StateProps => ({
    recordings: state.recordings,
    workspaceInfo: state.workspaceInfo
})
  
const mapDispatchToProps: MapDispatchToProps<DispatchProps, OwnProps> = (dispatch: Dispatch<RootAction>, ownProps: OwnProps) => ({
    onDeleteRecordings: (recordingIds: string[]) => deleteRecordings(dispatch, recordingIds),
    onSetRecordingInfo: ({ recordingId, recordingInfo }) => dispatch(setRecordingInfo({ recordingId, recordingInfo }))
})
>>>>>>> import recordings view python scripts

=======
>>>>>>> add WorspaceView
=======

>>>>>>> workspace view and simplified state flow
export default RecordingsTable