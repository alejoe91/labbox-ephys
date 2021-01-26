import React, { FunctionComponent } from 'react';
<<<<<<< 8b5ea1ca1a2be14685dd7e844b3ef682a6e48e34
<<<<<<< fae5d1af6666e69aa85868b4ea976236e06723c3
import { useSortingInfo } from '../../common/getRecordingInfo';
=======
import { useSortingInfo } from '../../../actions/getRecordingInfo';
>>>>>>> workspace view and simplified state flow
=======
import { useSortingInfo } from '../../common/getRecordingInfo';
>>>>>>> misc fixes
import { Sorting, SortingSelection, SortingSelectionDispatch } from '../../extensionInterface';
import UnitsTable from '../../unitstable/Units/UnitsTable';

type Props = {
    sorting: Sorting
    selection: SortingSelection
    selectionDispatch: SortingSelectionDispatch
}

const SelectUnitsWidget: FunctionComponent<Props> = ({ sorting, selection, selectionDispatch }) => {
    const sortingInfo = useSortingInfo(sorting.sortingObject, sorting.recordingObject)
    if (!sortingInfo) return <div>No sorting info</div>
    return (
        <UnitsTable
            units={sortingInfo?.unit_ids}
            {...{selection, selectionDispatch, sorting}}
        />
    )
}

export default SelectUnitsWidget