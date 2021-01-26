import { CircularProgress } from '@material-ui/core';
import React, { Dispatch, FunctionComponent, useCallback, useMemo } from 'react';
import { connect, MapDispatchToProps, MapStateToProps } from 'react-redux';
import { deleteSortings } from '../actions';
<<<<<<< 8b5ea1ca1a2be14685dd7e844b3ef682a6e48e34
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
import { WorkspaceInfo } from '../AppContainer';
import NiceTable from '../components/NiceTable';
import { useSortingInfos } from '../extensions/common/getRecordingInfo';
import { RootAction, RootState } from '../reducers';
<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
import { Sorting } from '../reducers/sortings';
import { WorkspaceRouteDispatch } from './WorkspaceView';
=======
import { Sorting, SortingInfo } from '../reducers/sortings';
import { WorkspaceInfo } from '../reducers/workspaceInfo';
>>>>>>> import recordings view python scripts
=======
import { useSortingInfos } from '../actions/getRecordingInfo';
=======
>>>>>>> misc fixes
import { WorkspaceInfo } from '../AppContainer';
import NiceTable from '../components/NiceTable';
import { useSortingInfos } from '../extensions/common/getRecordingInfo';
import { RootAction, RootState } from '../reducers';
import { Sorting } from '../reducers/sortings';
import { WorkspaceRouteDispatch } from './WorkspaceView';
>>>>>>> workspace view and simplified state flow



interface StateProps {
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
=======
    workspaceInfo: WorkspaceInfo
>>>>>>> import recordings view python scripts
=======
>>>>>>> workspace view and simplified state flow
}

interface DispatchProps {
    onDeleteSortings: (sortingIds: string[]) => void
}

interface OwnProps {
    sortings: Sorting[]
    workspaceRouteDispatch: WorkspaceRouteDispatch
    workspaceInfo: WorkspaceInfo
}

type Props = StateProps & DispatchProps & OwnProps

<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
=======
>>>>>>> workspace view and simplified state flow
const SortingsTable: FunctionComponent<Props> = ({ sortings, onDeleteSortings, workspaceInfo, workspaceRouteDispatch }) => {
    const { readOnly } = workspaceInfo;

    const handleViewSorting = useCallback((sorting: Sorting) => {
        workspaceRouteDispatch({
            type: 'gotoSortingPage',
            recordingId: sorting.recordingId,
            sortingId: sorting.sortingId
        })
    }, [workspaceRouteDispatch])

    const sortingInfos = useSortingInfos(sortings)
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3

    const sortings2: Sorting[] = useMemo(() => (sortByKey<Sorting>(sortings, 'sortingLabel')), [sortings])
    const rows = useMemo(() => (sortings2.map(s => {
        const sortingInfo = sortingInfos[s.sortingId]
        return {
            key: s.sortingId,
            columnValues: {
                sorting: s,
                sortingLabel: {
                    text: s.sortingLabel,
                    element: <ViewSortingLink sorting={s} onClick={handleViewSorting} />
                    // element: <Link title={"View this sorting"} to={`/${workspaceName}/sorting/${s.sortingId}${getPathQuery({feedUri})}`}>{s.sortingLabel}</Link>,
                },
                numUnits: sortingInfo ? sortingInfo.unit_ids.length : {element: <CircularProgress />}
            }
        }
    })), [sortings2, handleViewSorting, sortingInfos])
=======
const calculationPool = createCalculationPool({maxSimultaneous: 6})

const SortingsTable: FunctionComponent<Props> = ({ sortings, onDeleteSortings, onSetSortingInfo, workspaceInfo }) => {
    const hither = useContext(HitherContext)
    const { workspaceName, feedUri, readOnly } = workspaceInfo;
    const infosInProgress = useRef(new Set<string>())

    useEffect(() => {
        for (const sor of sortings) {
            if ((!sor.sortingInfo) && (!infosInProgress.current.has(sor.sortingId))) {
                infosInProgress.current.add(sor.sortingId)
                hither.createHitherJob(
                    'createjob_get_sorting_info',
                    { sorting_object: sor.sortingObject, recording_object: sor.recordingObject },
                    {
                        useClientCache: true,
                        calculationPool: calculationPool
                    }
                ).wait().then(sortingInfo => {
                    onSetSortingInfo({ sortingId: sor.sortingId, sortingInfo: sortingInfo });
                }).catch((err: Error) => {
                    console.error(err);
                    return;
                })
            }
        }
    }, [sortings, hither, onSetSortingInfo])
=======
>>>>>>> workspace view and simplified state flow

    const sortings2: Sorting[] = useMemo(() => (sortByKey<Sorting>(sortings, 'sortingLabel')), [sortings])
    const rows = useMemo(() => (sortings2.map(s => {
        const sortingInfo = sortingInfos[s.sortingId]
        return {
            key: s.sortingId,
            columnValues: {
                sorting: s,
                sortingLabel: {
                    text: s.sortingLabel,
                    element: <ViewSortingLink sorting={s} onClick={handleViewSorting} />
                    // element: <Link title={"View this sorting"} to={`/${workspaceName}/sorting/${s.sortingId}${getPathQuery({feedUri})}`}>{s.sortingLabel}</Link>,
                },
                numUnits: sortingInfo ? sortingInfo.unit_ids.length : {element: <CircularProgress />}
            }
        }
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
    }))), [sortings2, workspaceName, feedUri])
>>>>>>> import recordings view python scripts
=======
    })), [sortings2, handleViewSorting, sortingInfos])
>>>>>>> workspace view and simplified state flow

    const columns = [
        {
            key: 'sortingLabel',
            label: 'Sorting'
        },
        {
            key: 'numUnits',
            label: 'Num. units'
        }
    ]

    return (
        <div>
            <NiceTable
                rows={rows}
                columns={columns}
                deleteRowLabel={"Remove this sorting"}
                onDeleteRow={readOnly ? undefined : (key, columnValues) => onDeleteSortings([key])}
            />
        </div>
    );
}

const ViewSortingLink: FunctionComponent<{sorting: Sorting, onClick: (s: Sorting) => void}> = ({sorting, onClick}) => {
    const handleClick = useCallback(() => {
        onClick(sorting)
    }, [sorting, onClick])
    return (
        <Anchor title="View recording" onClick={handleClick}>{sorting.sortingLabel}</Anchor>
    )
}

const Anchor: FunctionComponent<{title: string, onClick: () => void}> = ({title, children, onClick}) => {
    return (
        <button type="button" className="link-button" onClick={onClick}>{children}</button>
    )
}

const sortByKey = <T extends {[key: string]: any}>(array: T[], key: string): T[] => {
    return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

const mapStateToProps: MapStateToProps<StateProps, OwnProps, RootState> = (state: RootState, ownProps: OwnProps): StateProps => ({ // todo
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
<<<<<<< aecffccec7401ef3fe6951958578928f0b85c04b
=======
    workspaceInfo: state.workspaceInfo
>>>>>>> import recordings view python scripts
=======
>>>>>>> workspace view and simplified state flow
})
  
const mapDispatchToProps: MapDispatchToProps<DispatchProps, OwnProps> = (dispatch: Dispatch<RootAction>, ownProps: OwnProps) => ({
    onDeleteSortings: (sortingIds: string[]) => dispatch(deleteSortings(sortingIds))
})

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
    mapStateToProps,
    mapDispatchToProps
)(SortingsTable)