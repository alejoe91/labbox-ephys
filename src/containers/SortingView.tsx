import { Accordion, AccordionDetails, AccordionSummary } from '@material-ui/core';
import React, { Dispatch, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { connect, MapDispatchToProps, MapStateToProps } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import { setExternalSortingUnitMetrics, setRecordingInfo, setSortingInfo } from '../actions';
import { getRecordingInfo } from '../actions/getRecordingInfo';
import { createCalculationPool, HitherContext, useHitherJob } from '../extensions/common/hither';
import { filterPlugins, Plugins, RecordingInfo, SortingCurationAction, SortingSelection, sortingSelectionReducer } from '../extensions/extensionInterface';
import { getPathQuery } from '../kachery';
import { RootAction, RootState } from '../reducers';
import { DocumentInfo } from '../reducers/documentInfo';
import { Recording } from '../reducers/recordings';
import { ExternalSortingUnitMetric, Sorting, SortingInfo } from '../reducers/sortings';

// const intrange = (a: number, b: number) => {
//   const lower = a < b ? a : b;
//   const upper = a < b ? b : a;
//   let arr = [];
//   for (let n = lower; n <= upper; n++) {
//       arr.push(n);
//   }
//   return arr;
// }

interface StateProps {
  sorting?: Sorting
  recording?: Recording
  extensionsConfig: any
  documentInfo: DocumentInfo
  plugins: Plugins
}

interface DispatchProps {
  onSetSortingInfo: (a: {sortingId: string, sortingInfo: SortingInfo}) => void
  onSetRecordingInfo: (a: {recordingId: string, recordingInfo: RecordingInfo}) => void
  onSetExternalUnitMetrics: (a: { sortingId: string, externalUnitMetrics: ExternalSortingUnitMetric[] }) => void
  curationDispatch: (a: SortingCurationAction) => void
}

interface OwnProps {
  sortingId: string,
  width: number,
  height: number
}

type Props = StateProps & DispatchProps & OwnProps & RouteComponentProps

type CalcStatus = 'waiting' | 'computing' | 'finished'

const calculationPool = createCalculationPool({maxSimultaneous: 6})

const SortingView: React.FunctionComponent<Props> = (props) => {
  const hither = useContext(HitherContext)
  const { plugins, documentInfo, sorting, sortingId, recording, curationDispatch, onSetSortingInfo, onSetRecordingInfo, onSetExternalUnitMetrics } = props
  const { documentId, feedUri, readOnly } = documentInfo;
  const [externalUnitMetricsStatus, setExternalUnitMetricsStatus] = useState<CalcStatus>('waiting');
  //const initialSortingSelection: SortingSelection = {currentTimepoint: 1000, animation: {currentTimepointVelocity: 100, lastUpdateTimestamp: Number(new Date())}}
  const initialSortingSelection: SortingSelection = {}
  const [selection, selectionDispatch] = useReducer(sortingSelectionReducer, initialSortingSelection)
  useEffect(() => {
    if (recording?.recordingInfo) {
      if (!selection.timeRange) {
        const newTimeRange = {min: 0, max: Math.min(recording.recordingInfo.num_frames, Math.floor(recording.recordingInfo.sampling_frequency / 10))}
        selectionDispatch({type: 'SetTimeRange', timeRange: newTimeRange})
      }
    }
  }, [recording?.recordingInfo, selection.timeRange])
  // const [anchorUnitId, setAnchorUnitId] = useState<number | null>(null)
  
  // const [focusedUnitId, setFocusedUnitId] = useState<number | null>(null)

  // const effect = async () => {
  //   if ((sorting) && (recording) && (!sorting.sortingInfo) && (sortingInfoStatus === 'waiting')) {
  //     setSortingInfoStatus('computing');
  //     const sortingInfo = await createHitherJob(
  //       'createjob_get_sorting_info',
  //       { sorting_object: sorting.sortingObject, recording_object: recording.recordingObject },
  //       { kachery_config: {}, useClientCache: true }
  //     );
  //     onSetSortingInfo({ sortingId, sortingInfo });
  //     setSortingInfoStatus('finished');
  //   }
  // }
  // useEffect(() => {effect()});

  const {result: sortingInfo, job: sortingInfoJob} = useHitherJob<SortingInfo>(
    'createjob_get_sorting_info',
    { sorting_object: sorting?.sortingObject, recording_object: recording?.recordingObject },
    { useClientCache: true }
  )

  useEffect(() => {
    sorting?.sortingId && sortingInfo && onSetSortingInfo({sortingId: sorting.sortingId, sortingInfo})
  }, [sorting?.sortingId, sortingInfo, onSetSortingInfo])

  useEffect(() => {
    if ((sorting) && (sorting.externalUnitMetricsUri) && (!sorting.externalUnitMetrics) && (externalUnitMetricsStatus === 'waiting')) {
      setExternalUnitMetricsStatus('computing');
      hither.createHitherJob(
        'fetch_external_sorting_unit_metrics',
        { uri: sorting.externalUnitMetricsUri },
        { useClientCache: true }
      ).wait().then((externalUnitMetrics: any) => {
        onSetExternalUnitMetrics({ sortingId, externalUnitMetrics: externalUnitMetrics as ExternalSortingUnitMetric[] });
        setExternalUnitMetricsStatus('finished');
      })
    }
  }, [onSetExternalUnitMetrics, setExternalUnitMetricsStatus, externalUnitMetricsStatus, sorting, sortingId, hither])

  const [recordingInfoStatus, setRecordingInfoStatus]= useState<'waiting' | 'calculating' | 'finished' | 'error'>('waiting')
  useEffect(() => {
    if (!recording) return;
    if (recordingInfoStatus === 'waiting') {
      const rec = recording;
      if (rec.recordingInfo) {
        setRecordingInfoStatus('finished')
      }
      else {
        setRecordingInfoStatus('calculating')
        getRecordingInfo({ recordingObject: rec.recordingObject, hither }).then((info: RecordingInfo) => {
          setRecordingInfoStatus('finished')
          onSetRecordingInfo({ recordingId: rec.recordingId, recordingInfo: info })
        })
        .catch((err: Error) => {
          setRecordingInfoStatus('error')
          console.error(err)
        })
      }
    }
  }, [recording, hither, onSetRecordingInfo, recordingInfoStatus, setRecordingInfoStatus])

  // const sidebarWidth = '200px'

  // const sidebarStyle = {
  //   'width': sidebarWidth,
  //   'height': '100%',
  //   'position': 'absolute',
  //   'zIndex': 1,
  //   'top': 165,
  //   'left': 0,
  //   'overflowX': 'hidden',
  //   'paddingTop': '20px',
  //   'paddingLeft': '20px'
  // }

  const W = props.width || 800
  const H = props.height || 800

  const headingHeight = 70

  const headingStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: W,
    height: headingHeight,
    overflow: 'auto'
  }), [W, headingHeight])

  const contentWrapperStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    left: 0,
    top: headingHeight,
    width: W,
    height: H - headingHeight
  }), [headingHeight, W, H])

  const sv = plugins.sortingViews['MVSortingView']
  if (!sv) throw Error('Missing sorting view: MVSortingView')
  const svProps = useMemo(() => (sv.props || {}), [sv.props])

  if (!sorting) {
    return <h3>{`Sorting not found: ${sortingId}`}</h3>
  }
  if (!recording) {
    return <h3>{`Recording not found: ${sorting.recordingId}`}</h3>
  }

  // const selectedUnitIdsLookup: {[key: string]: boolean} = (selection.selectedUnitIds || []).reduce((m, uid) => {m[uid + ''] = true; return m}, {} as {[key: string]: boolean})
  return (
    <div>
      <div style={headingStyle}>
        <h3>
          {`Sorting: ${sorting.sortingLabel} for `}
          <Link to={`/${documentId}/recording/${recording.recordingId}/${getPathQuery({feedUri})}`}>
            {recording.recordingLabel}
          </Link>
        </h3>
      </div>
      <div style={contentWrapperStyle}>
          <sv.component
            {...svProps}
            sorting={sorting}
            recording={recording}
            selection={selection}
            selectionDispatch={selectionDispatch}
            curationDispatch={curationDispatch}
            readOnly={readOnly}
            plugins={plugins}
            calculationPool={calculationPool}
            width={W}
            height={H - headingHeight}
          />
      </div>
    </div>
  );
}

export const Expandable = (props: { label: string, children: React.ReactNode[] | React.ReactNode, defaultExpanded?: boolean }) => {
  return (
    <Accordion TransitionProps={{ unmountOnExit: true }} defaultExpanded={props.defaultExpanded}>
      <AccordionSummary>
        {props.label}
      </AccordionSummary>
      <AccordionDetails>
        <div style={{width: "100%"}}>
          {props.children}
        </div>
      </AccordionDetails>
    </Accordion>
  )
}

function findSortingForId(state: any, id: string): Sorting | undefined {
  return state.sortings.filter((s: any) => (s.sortingId === id)).map((s: any) => (s as any as Sorting))[0]
}

function findRecordingForId(state: any, id: string): Recording | undefined {
  return state.recordings.filter((s: any) => (s.recordingId === id)).map((s: any) => (s as any as Recording))[0]
}

const mapStateToProps: MapStateToProps<StateProps, OwnProps, RootState> = (state: RootState, ownProps: OwnProps): StateProps => ({ // todo
  plugins: filterPlugins(state.plugins),
  // todo: use selector
  sorting: findSortingForId(state, ownProps.sortingId),
  recording: findRecordingForId(state, (findSortingForId(state, ownProps.sortingId) || {recordingId: ''}).recordingId),
  extensionsConfig: state.extensionsConfig,
  documentInfo: state.documentInfo
})

const mapDispatchToProps: MapDispatchToProps<DispatchProps, OwnProps> = (dispatch: Dispatch<RootAction>, ownProps: OwnProps) => {
  const curationDispatch = (a: SortingCurationAction) => {
    if (a.type === 'SetCuration') {
      dispatch({type: 'SET_CURATION', sortingId: ownProps.sortingId, curation: a.curation, persistKey: 'sortings'})
    }
    else if (a.type === 'AddLabel') {
      dispatch({type: 'ADD_UNIT_LABEL', sortingId: ownProps.sortingId, unitId: a.unitId, label: a.label, persistKey: 'sortings'})
    }
    else if (a.type === 'RemoveLabel') {
      dispatch({type: 'REMOVE_UNIT_LABEL', sortingId: ownProps.sortingId, unitId: a.unitId, label: a.label, persistKey: 'sortings'})
    }
    else if (a.type === 'MergeUnits') {
      dispatch({type: 'MERGE_UNITS', sortingId: ownProps.sortingId, unitIds: a.unitIds, persistKey: 'sortings'})
    }
    else if (a.type === 'UnmergeUnits') {
      dispatch({type: 'UNMERGE_UNITS', sortingId: ownProps.sortingId, unitIds: a.unitIds, persistKey: 'sortings'})
    }
  }
  return {
    onSetSortingInfo: (a: { sortingId: string, sortingInfo: SortingInfo }) => dispatch(setSortingInfo(a)),
    onSetRecordingInfo: (a: { recordingId: string, recordingInfo: RecordingInfo }) => dispatch(setRecordingInfo(a)),
    onSetExternalUnitMetrics: (a: { sortingId: string, externalUnitMetrics: ExternalSortingUnitMetric[] }) => dispatch(setExternalSortingUnitMetrics(a)),
    curationDispatch
  }
}

export default withRouter(connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(SortingView))