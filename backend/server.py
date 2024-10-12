# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Main entrypoint for the application."""
from __future__ import annotations

import json
import os

import flask
from googleads_housekeeper import bootstrap
from googleads_housekeeper import views
from googleads_housekeeper.domain import commands
from googleads_housekeeper.domain.core import execution

app = flask.Flask(__name__)

STATIC_DIR = os.getenv('STATIC_DIR') or 'static'

DEPLOYMENT_TYPE = os.getenv('ADS_HOUSEKEEPER_DEPLOYMENT_TYPE', 'Dev')

bus = bootstrap.Bootstrapper(type=DEPLOYMENT_TYPE,
                             topic_prefix='cpr').bootstrap_app()

if DEPLOYMENT_TYPE == 'Google Cloud':
    from google.appengine.api import wrap_wsgi_app

    app.wsgi_app = wrap_wsgi_app(app.wsgi_app)


@app.before_request
def check_youtube_data_api_key():
    if not os.getenv('YOUTUBE_DATA_API_KEY'):
        raise RuntimeError('YOUTUBE_DATA_API_KEY is not set')


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    file_requested = os.path.join(app.root_path, STATIC_DIR, path)
    if not os.path.isfile(file_requested):
        path = 'index.html'
    max_age = 0 if path == 'index.html' else None
    return flask.send_from_directory(STATIC_DIR, path, max_age=max_age)


# Commands
@app.route('/api/previewPlacements', methods=['POST'])
def preview_placements():
    config = views.config(bus.uow)
    if not config:
        ads_client = bus.dependencies.get('ads_api_client').client
        if not (mcc_id := ads_client.login_customer_id):
            mcc_id = ads_client.linked_customer_id
        cmd = commands.SaveConfig(mcc_id=mcc_id, email_address='', id=None)
        bus.handle(cmd)
        config = {'mcc_id': mcc_id, 'email_address': ''}
    else:
        config = config[0]
    data = flask.request.get_json(force=True)
    cmd = commands.PreviewPlacements(**data,
                                     save_to_db=config.get('save_to_db', True))
    result = bus.handle(cmd)
    return _build_response(json.dumps(result))


@app.route('/api/runManualExcluder', methods=['POST', 'GET'])
def run_manual_excluder():
    data = flask.request.get_json(force=True)
    cmd = commands.RunManualExclusion(**data)
    result = bus.handle(cmd)
    resp = _build_response(json.dumps(result))
    return resp


@app.route('/api/runTaskFromTaskId', methods=['POST'])
def run_task_from_task_id():
    [config] = views.config(bus.uow)
    data = flask.request.get_json(force=True)
    data.update({'save_to_db': config.get('save_to_db', True)})
    cmd = commands.RunTask(**data)
    result, message_payload = bus.handle(cmd)
    if message_payload.total_placement_excluded:
        bus.dependencies.get('notification_service').send(message_payload)
    return _build_response(json.dumps(result))


@app.route('/api/runTaskFromScheduler/<task_id>', methods=['GET'])
def run_task_from_scheduler(task_id):
    cmd = commands.RunTask(id=task_id,
                           type=execution.ExecutionTypeEnum.SCHEDULED)
    result, message_payload = bus.handle(cmd)
    if message_payload.total_placement_excluded:
        bus.dependencies.get('notification_service').send(message_payload)
    return _build_response(json.dumps(result))


@app.route('/api/saveTask', methods=['POST'])
def save_task():
    data = flask.request.get_json(force=True)
    cmd = commands.SaveTask(**data)
    task_id = bus.handle(cmd)
    return _build_response(json.dumps(str(task_id)))


@app.route('/api/deleteTask', methods=['POST'])
def delete_task():
    data = flask.request.get_json(force=True)
    cmd = commands.DeleteTask(**data)
    bus.handle(cmd)
    return _build_response(json.dumps(str(cmd.task_id)))


@app.route('/api/setConfig', methods=['POST'])
def set_config():
    data = flask.request.get_json(force=True)
    if existing_config := views.config(bus.uow):
        cmd = commands.SaveConfig(id=existing_config[0].get('id'), **data)
    else:
        cmd = commands.SaveConfig(**data)
    bus.handle(cmd)
    return _build_response(json.dumps('success'))


@app.route('/api/addToAllowlist', methods=['POST'])
def add_to_allowlisting():
    data = flask.request.get_json(force=True)
    cmd = commands.AddToAllowlisting(**data)
    result = bus.handle(cmd)
    return _build_response(json.dumps('success'))


@app.route('/api/removeFromAllowlist', methods=['POST'])
def remove_from_allowlisting():
    data = flask.request.get_json(force=True)
    cmd = commands.RemoveFromAllowlisting(**data)
    result = bus.handle(cmd)
    return _build_response(json.dumps('success'))


# Views
@app.route('/api/getTasksList', methods=['GET'])
def get_tasks_list():
    result = views.tasks(bus.uow)
    return _build_response(json.dumps(result, default=str))


@app.route('/api/task/<task_id>', methods=['GET'])
def get_task_id(task_id):
    result = views.task(task_id, bus.uow)
    if not result:
        return 'not found', 404
    return _build_response(json.dumps(result, default=str))


@app.route('/api/task/<task_id>/executions', methods=['GET'])
def get_task_executions(task_id):
    result = views.executions(task_id, bus.uow)
    if not result:
        return 'not found', 404
    return _build_response(json.dumps(result, default=str))


@app.route('/api/task/<task_id>/executions/<execution_id>', methods=['GET'])
def get_task_execution_id(task_id, execution_id):
    result = views.execution_details(task_id, execution_id, bus.uow)
    if not result:
        return 'not found', 404
    return _build_response(json.dumps(result, default=str))


@app.route('/api/getTask', methods=['POST'])
def get_task():
    data = flask.request.get_json(force=True)
    result = views.task(data['task_id'], bus.uow)
    if not result:
        return 'not found', 404
    return _build_response(json.dumps(result, default=str))


@app.route('/api/migrateOldTasks', methods=['GET'])
def migrate_old_tasks():
    cmd = commands.MigrateFromOldTasks()
    bus.handle(cmd)
    return _build_response(json.dumps('Migration completed', default=str))

@app.route('/api/getConfig', methods=['GET'])
def get_config():
    result = views.config(bus.uow)
    if not result:
        ads_client = bus.dependencies.get('ads_api_client').client
        if not (mcc_id := ads_client.login_customer_id):
            mcc_id = ads_client.linked_customer_id
        cmd = commands.SaveConfig(mcc_id=mcc_id, email_address='', id=None)
        bus.handle(cmd)
        result = {'mcc_id': mcc_id, 'email_address': ''}
    else:
        result = result[0]
    return _build_response(json.dumps(result))


@app.route('/api/getMccIds', methods=['GET'])
def get_all_mcc_ids():
    if not (mcc_ids := views.mcc_ids(bus.uow)):
        root_mcc_id = _get_mcc_from_ads_client()
        cmd = commands.GetMccIds(root_mcc_id)
        mcc_ids = bus.handle(cmd)
    return _build_response(json.dumps(mcc_ids))


@app.route('/api/updateMccIds', methods=['POST'])
def update_mcc_ids():
    root_mcc_id = _get_mcc_from_ads_client()
    cmd = commands.GetMccIds(root_mcc_id)
    mcc_ids = bus.handle(cmd)
    return _build_response(json.dumps(mcc_ids))


@app.route('/api/getCustomerIds', methods=['GET'])
def get_customer_ids():
    if not (config := views.config(bus.uow)):
        mcc_id = _get_mcc_from_ads_client()
    else:
        mcc_id = config[0].get('mcc_id')
    result = views.customer_ids(bus.uow, mcc_id)
    if not result:
        cmd = commands.GetCustomerIds(mcc_id=mcc_id)
        result = bus.handle(cmd)
    return _build_response(json.dumps(result))


@app.route('/api/updateCustomerIds', methods=['POST'])
def update_customer_ids():
    if not flask.request.values:
        mcc_ids = [account.get('id') for account in views.mcc_ids(bus.uow)]
    else:
        data = flask.request.get_json(force=True)
        if not (mcc_id := data.get('mcc_id')):
            if not (config := views.config(bus.uow)):
                mcc_id = _get_mcc_from_ads_client()
            else:
                mcc_id = config[0].get('mcc_id')
        mcc_ids = [mcc_id]
    results = []
    for mcc_id in mcc_ids:
        cmd = commands.GetCustomerIds(mcc_id=mcc_id)
        results.append(bus.handle(cmd))
    return _build_response(json.dumps(results))


@app.route('/api/getAllowlistedPlacements', methods=['GET'])
def get_allowlisted_placements():
    if result := views.allowlisted_placements(bus.uow):
        return _build_response(json.dumps(result, default=str))
    return 'no allowlisted placements', 200


def _build_response(msg='', status=200, mimetype='application/json'):
    """Helper method to build the response."""
    response = app.response_class(msg, status=status, mimetype=mimetype)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


def _get_mcc_from_ads_client() -> str:
    ads_client = bus.dependencies.get('ads_api_client').client
    if not (mcc_id := ads_client.login_customer_id):
        mcc_id = ads_client.linked_customer_id
    return mcc_id


if __name__ == '__main__':
    app.run(debug=True, port=5000)
