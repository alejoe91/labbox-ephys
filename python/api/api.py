import traceback
import urllib
import json
import os
import threading
import time
import sys
from flask import Flask, request, Response
import hither as hi
import urllib
import kachery as ka
import kachery_p2p as kp
import requests
import base64

# this is how the hither functions get registered
import labbox_ephys as le

thisdir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(f'{thisdir}/../../src')
import pluginComponents

app = Flask(__name__)
global_data = dict(
    default_job_handler=hi.ParallelJobHandler(num_workers=4),
    jobs_by_id=dict()
)
global_data_lock = threading.Lock()
def iterate_worker_thread():
    global global_data
    with global_data_lock:
        pass
    thread = threading.Timer(3, iterate_worker_thread, ())
    thread.start()
def start_worker_thread():
    thread = threading.Timer(1, iterate_worker_thread, ())
    thread.start()

def decodeURIComponent(x):
    return urllib.parse.unquote(x)

# We don't want to put the /index.html in the url
# Thanks again: https://blog.miguelgrinberg.com/post/how-to-deploy-a-react--flask-project
@app.route('/')
def index():
    return app.send_static_file('index.html')

def _create_job_handler_from_config(x):
    job_handler_type = x['jobHandlerType']
    if job_handler_type == 'default':
        return hi.ParallelJobHandler(num_workers=4)
    elif job_handler_type == 'remote':
        event_stream_url = x['config']['eventStreamUrl']
        channel = x['config']['channel']
        password = x['config']['password']
        compute_resource_id = x['config']['computeResourceId']
        esc = hi.EventStreamClient(event_stream_url, channel=channel, password=password)
        jh = hi.RemoteJobHandler(event_stream_client=esc, compute_resource_id=compute_resource_id)
        return jh
    else:
        raise Exception(f'Unexpected job handler type: {job_handler_type}')

@app.route('/api/create_hither_job', methods=['POST'])
def create_hither_job():
    global global_data

    x = request.json
    functionName = x['functionName']
    kwargs = x['kwargs']
    opts = x['opts']
    if opts.get('auto_substitute_file_objects', False):
        kwargs = _auto_substitute_file_objects_in_item(kwargs)
    kwargs = _deserialize_files_in_item(kwargs)
    kachery_config = opts.get('kachery_config', {})
    hither_config = opts.get('hither_config', {})
    if 'job_handler_config' in hither_config:
        job_handler_config = hither_config.get('job_handler_config')
        del hither_config['job_handler_config']
    else:
        job_handler_config = None

    # if job_handler_config is not None:
    #     hither_config['job_handler'] = _create_job_handler_from_config(job_handler_config)
    # else:
    #     with global_data_lock:
    #         hither_config['job_handler'] = global_data['default_job_handler']
    # if hither_config['job_handler'].is_remote:
    #     hither_config['container'] = True
    
    with global_data_lock:
        with ka.config(**kachery_config):
            with hi.Config(**hither_config):
                job = hi.run(functionName, **kwargs)
                job_id = job._job_id
                global_data['jobs_by_id'][job_id] = job
                print(f'======== Created hither job: {job_id} {functionName}')
                return dict(
                    job_id=job_id
                )

@app.route('/api/hither_job_wait', methods=['POST'])
def hither_job_wait():
    x = request.json
    job_id = x['job_id']
    timeout_sec = x['timeout_sec']
    assert job_id, 'Missing job_id'
    global global_data
    with global_data_lock:
        assert job_id in global_data['jobs_by_id'], f'No job with id: {job_id}'
        job: hi.Job = global_data['jobs_by_id'][job_id]
    timer = time.time()
    while True:
        with global_data_lock:
            try:
                job.wait(0)
            except Exception:
                # print(''.join(traceback.format_tb(job.get_exception().__traceback__)))
                traceback.print_exc()
                return dict(
                    error=True,
                    error_message=str(job.get_exception()),
                    runtime_info=job.get_runtime_info()
                )
            if job.get_status() == hi.JobStatus.FINISHED:
                result = job.get_result()
                result = _serialize_files_in_item(result)
                print(f'======== Finished hither job: {job_id} {job.get_label()}')
                return dict(
                    error=False,
                    result=result,
                    runtime_info=job.get_runtime_info()
                )
        # Note that this sleep is importantly outside the lock context
        time.sleep(0.1)
        elapsed = time.time() - timer
        if elapsed > timeout_sec:
            return dict(
                timeout=True
            )

@app.route('/api/hither_job_cancel', methods=['POST'])
def hither_job_cancel():
    x = request.json
    job_id = x['job_id']
    assert job_id, 'Missing job_id'
    global global_data
    with global_data_lock:
        assert job_id in global_data['jobs_by_id'], f'No job with id: {job_id}'
        job: hi.Job = global_data['jobs_by_id'][job_id]
    job.cancel()
    return dict()

@app.route('/api/kachery/feed/getFeedId', methods=['POST'])
def kachery_feed_get_feed_id():
    x = request.json
    feedName = x['feedName']
    try:
        feed_id = kp.get_feed_id(feedName, create=False)
    except Exception as err:
        return dict(
            success=False,
            error=str(err)
        )
    return dict(
        success=True,
        feedId=feed_id
    )

@app.route('/api/kachery/feed/getNumMessages', methods=['POST'])
def kachery_feed_get_num_messages():
    x = request.json
    feedId = x['feedId']
    subfeedName = x['subfeedName']
    feed = kp.load_feed(f'feed://{feedId}')
    subfeed = feed.get_subfeed(subfeedName)
    num_messages = subfeed.get_num_messages()
    return dict(
        success=True,
        numMessages=num_messages
    )

@app.route('/api/kachery/feed/getMessages', methods=['POST'])
def kachery_feed_get_messages():
    x = request.json
    feedId = x['feedId']
    subfeedName = x['subfeedName']
    position = x['position']
    waitMsec = x['waitMsec']
    maxNumMessages = x['maxNumMessages']
    feed = kp.load_feed(f'feed://{feedId}')
    subfeed = feed.get_subfeed(subfeedName)
    subfeed.set_position(position)
    messages = subfeed.get_next_messages(wait_msec=waitMsec, max_num_messages=maxNumMessages)
    return dict(
        success=True,
        messages=messages
    )

@app.route('/api/kachery/feed/watchForNewMessages', methods=['POST'])
def kachery_feed_watch_for_new_messages():
    x = request.json
    subfeed_watches = x['subfeedWatches']
    wait_msec = x['waitMsec']

    messages = kp.watch_for_new_messages(subfeed_watches=subfeed_watches, wait_msec=wait_msec)
    return dict(
        success=True,
        messages=messages
    )

@app.route('/api/kachery/feed/appendMessages', methods=['POST'])
def kachery_feed_append_messages():
    x = request.json
    feedId = x['feedId']
    subfeedName = x['subfeedName']
    messages = x['messages']
    feed = kp.load_feed(f'feed://{feedId}')
    subfeed = feed.get_subfeed(subfeedName)
    print('appending messages', feedId, subfeedName, messages)
    subfeed.append_messages(messages)
    return dict(
        success=True
    )

@app.route('/api/kachery/loadText', methods=['POST'])
def kachery_load_text():
    x = request.json
    uri = x['uri']
    try:
        text = kp.load_text(uri)
    except Exception as err:
        return dict(
            success=False,
            error=str(err)
        )
    return dict(
        success=True,
        text=text
    )

@app.route('/api/kachery/loadObject', methods=['POST'])
def kachery_load_object():
    x = request.json
    uri = x['uri']
    try:
        obj = kp.load_object(uri)
    except Exception as err:
        return dict(
            success=False,
            error=str(err)
        )
    return dict(
        success=True,
        object=obj
    )

@app.route('/api/kachery/loadBytes', methods=['POST'])
def kachery_load_bytes():
    x = request.json
    uri = x['uri']
    start = x.get('start', None)
    end = x.get('end', None)
    try:
        buf = kp.load_bytes(uri, start=start, end=end)
    except Exception as err:
        return dict(
            success=False,
            error=str(err)
        )
    return dict(
        success=True,
        data_b64=base64.b64encode(buf) 
    )


@app.route('/api/get_event_stream_websocket_port', methods=['GET'])
def get_event_stream_websocket_port():
    return dict(
        port=int(os.environ['EVENT_STREAM_WEBSOCKET_PORT'])
    )

@app.route('/api/eventstream/<path:path>',methods=['GET', 'POST'])
def eventstream(path):
    # thanks: https://medium.com/customorchestrator/simple-reverse-proxy-server-using-flask-936087ce0afb
    if request.method == 'GET':
        resp = requests.get(f'{os.environ["EVENT_STREAM_URL"]}/{path}')
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in  resp.raw.headers.items() if name.lower() not in excluded_headers]
        response = Response(resp.content, resp.status_code, headers)
        return response
    elif request.method=='POST':
        resp = requests.post(f'{os.environ["EVENT_STREAM_URL"]}/{path}',json=request.get_json())
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]
        response = Response(resp.content, resp.status_code, headers)
        return response
    else:
        raise Exception(f'Unexpected method: {request.method}')

def _resolve_files_in_item(x):
    if isinstance(x, hi.File):
        if x._item_type == 'file':
            path = kp.load_file(x._sha1_path)
            assert path is not None, f'Unable to load file: {x._sha1_path}'
            return path
        elif x._item_type == 'ndarray':
            return x.array()
        else:
            raise Exception(f'Unexpected item type: {x._item_type}')
    elif type(x) == dict:
        ret = dict()
        for key, val in x.items():
            ret[key] = _resolve_files_in_item(val)
        return ret
    elif type(x) == list:
        return [_resolve_files_in_item(val) for val in x]
    elif type(x) == tuple:
        return tuple([_resolve_files_in_item(val) for val in x])
    else:
        return x

def _serialize_files_in_item(x):
    if isinstance(x, hi.File):
        if x._item_type == 'file':
            return dict(
                _type='_hither_file',
                path=x._sha1_path
            )
        elif x._item_type == 'ndarray':
            return x.array()
        else:
            raise Exception(f'Unexpected item type: {x._item_type}')
    elif type(x) == dict:
        ret = dict()
        for key, val in x.items():
            ret[key] = _serialize_files_in_item(val)
        return ret
    elif type(x) == list:
        return [_serialize_files_in_item(val) for val in x]
    elif type(x) == tuple:
        return tuple([_serialize_files_in_item(val) for val in x])
    else:
        return x

def _deserialize_files_in_item(x):
    if type(x) == dict:
        if ('_type' in x) and (x['_type'] == '_hither_file'):
            return hi.File(x['path'])
        else:
            ret = dict()
            for key, val in x.items():
                ret[key] = _deserialize_files_in_item(val)
            return ret
    elif type(x) == list:
        return [_deserialize_files_in_item(val) for val in x]
    elif type(x) == tuple:
        return tuple([_deserialize_files_in_item(val) for val in x])
    else:
        return x

def _auto_substitute_file_objects_in_item(x):
    if type(x) == dict:
        ret = dict()
        for key, val in x.items():
            ret[key] = _auto_substitute_file_objects_in_item(val)
        return ret
    elif type(x) == list:
        return [_auto_substitute_file_objects_in_item(val) for val in x]
    elif type(x) == tuple:
        return tuple([_auto_substitute_file_objects_in_item(val) for val in x])
    elif type(x) == str:
        do_substitute = False
        if x.startswith('sha1://'):
            do_substitute = True
        if x.startswith('sha1dir://'):
            if ka.get_file_info(x):
                # must be a file
                do_substitute = True
        if do_substitute:
            return hi.File(x)
        else:
            return x
    else:
        return x

# Handle the react history routing
# So, for example, if we reload the page with some path in the url
# Thanks: https://stackoverflow.com/questions/30620276/flask-and-react-routing
@app.route('/', defaults={'u_path': ''})
@app.route('/<path:u_path>')
def catch_all(u_path):
    return app.send_static_file(f'../build/{u_path}')
    # return app.send_static_file('index.html')

@hi.function('save_state_to_disk', '0.1.0')
def save_state_to_disk(state):
    def save_state_to_disk_helper(field, state):
        if os.path.exists('/data'):
            with open(f'/data/{field}.json', 'w') as f:
                json.dump(state, f)
            return True
        else:
            return False
    print('Saving state to disk.')
    for field in ['sortings', 'sortingJobs', 'jobHandlers']:
        if not save_state_to_disk_helper(field, state[field]):
            return False
    return True

@hi.function('get_state_from_disk', '0.1.0')
def get_state_from_disk():
    def get_state_from_disk_helper(field):
        if os.path.exists('/data'):
            try:
                with open(f'/data/{field}.json', 'r') as f:
                    return json.load(f)
            except:
                return None
        else:
            return None
    print('Loading state from disk.')
    ret = dict(
        # recordings=get_state_from_disk_helper('recordings') or [],
        sortings=get_state_from_disk_helper('sortings') or [],
        sortingJobs=get_state_from_disk_helper('sortingJobs') or [],
        jobHandlers=get_state_from_disk_helper('jobHandlers') or {}
    )
    return ret

@hi.function('get_local_data_dir', '0.1.0')
def get_local_data_dir():
    return ka.read_dir('/data')

@hi.function('get_importable_recordings', '0.1.2')
def get_importable_recordings(subdir=''):
    basedir = _joinpaths('/data/import', subdir)
    ret = []
    timer = time.time()
    if not os.path.exists(basedir):
        return ret
    x = ka.read_dir(basedir)
    elapsed = time.time() - timer
    if elapsed < 1:
        time.sleep(1 - elapsed)
    file_and_dirnames = list(x['dirs'].keys()) + list(x['files'].keys())
    for name in file_and_dirnames:
        # path = ka.store_dir(f'{basedir}/{dirname}')
        path = f'{basedir}/{name}'
        if le.LabboxEphysRecordingExtractor.can_load(path):
            try:
                recording_object = le.LabboxEphysRecordingExtractor(path).object()
            except:
                traceback.print_exc()
                print(f'Warning: problem loading recording: {path}')
                recording_object = None
            if recording_object is not None:
                info = le.get_recording_info(recording_object)
                if name in x['dirs'].keys():
                    path2 = ka.store_dir(path)
                else:
                    path2 = ka.store_file(path)
                ret.append(dict(
                    label=_joinpaths(subdir, name),
                    path=path2,
                    recording_object=recording_object,
                    recording_info=info
                ))
        else:
            if name in x['dirs'].keys():
                ret = ret + get_importable_recordings(subdir = _joinpaths(subdir, name))
    return ret

def _joinpaths(p1, p2):
    if not p1:
        return p2
    if not p2:
        return p1
    return p1 + '/' + p2
    
@hi.function('test_python_call', '0.1.0')
def test_python_call():
    return 'output-from-test-python-call'


# start_worker_thread()
