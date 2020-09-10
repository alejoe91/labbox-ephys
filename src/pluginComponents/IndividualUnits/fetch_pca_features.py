import hither as hi
from labbox_ephys import prepare_snippets_h5
import kachery as ka
import numpy as np

@hi.function('createjob_fetch_pca_features', '0.1.0')
def createjob_fetch_pca_features(labbox, recording_object, sorting_object, unit_ids):
    jh = labbox.get_job_handler('partition2')
    jc = labbox.get_default_job_cache()
    with hi.Config(
        job_cache=jc,
        job_handler=jh,
        container=jh.is_remote
    ):
        snippets_h5 = prepare_snippets_h5.run(recording_object=recording_object, sorting_object=sorting_object)
        return fetch_pca_features.run(
            snippets_h5=snippets_h5,
            unit_ids=unit_ids
        )

@hi.function('fetch_pca_features', '0.2.6')
@hi.container('docker://magland/labbox-ephys-processing:0.3.19')
@hi.local_modules(['../../../python/labbox_ephys'])
def fetch_pca_features(snippets_h5, unit_ids):
    import h5py
    h5_path = ka.load_file(snippets_h5)
    with h5py.File(h5_path, 'r') as f:
        x = [
            dict(
                unit_id=unit_id,
                unit_waveforms=np.array(f.get(f'unit_waveforms/{unit_id}/waveforms')),
                unit_waveforms_channel_ids=np.array(f.get(f'unit_waveforms/{unit_id}/channel_ids'))
            )
            for unit_id in unit_ids
        ]
        channel_ids = _intersect_channel_ids([a['unit_waveforms_channel_ids'] for a in x])
        assert len(channel_ids) > 0, 'No channel ids in intersection'
        for a in x:
            unit_waveforms = a['unit_waveforms']
            unit_waveforms_channel_ids = a['unit_waveforms_channel_ids']
            inds = [np.where(unit_waveforms_channel_ids == ch_id)[0][0] for ch_id in channel_ids]
            a['unit_waveforms_2'] = unit_waveforms[:, inds, :]
            a['labels'] = np.ones((unit_waveforms.shape[0],)) * a['unit_id']
    
    unit_waveforms = np.concatenate([a['unit_waveforms_2'] for a in x], axis=0)
    labels = np.concatenate([a['labels'] for a in x]).astype(int)

    from sklearn.decomposition import PCA

    nf = 2 # number of features

    # list of arrays
    W = unit_waveforms # ntot x M x T

    # ntot x MT
    X = W.reshape((W.shape[0], W.shape[1] * W.shape[2]))

    pca = PCA(n_components=nf)
    pca.fit(X)

    features = pca.transform(X) # n x nf

    return dict(
        xfeatures=features[:, 0].squeeze().tolist(),
        yfeatures=features[:, 1].squeeze().tolist(),
        labels=labels.tolist()
    )

def _intersect_channel_ids(a):
    ret = a[0]
    for channel_ids in a:
        ret = np.intersect1d(channel_ids, ret)
    return ret