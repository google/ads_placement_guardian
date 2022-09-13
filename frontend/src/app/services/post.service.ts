/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface ReturnPromise {
  response: string
}

@Injectable({
  providedIn: 'root'
})
export class PostService {

  private baseUrl = 'http://127.0.0.1:5000';

  constructor(private httpClient: HttpClient) {
    if(window.location.href.includes(':5000'))
    {
      this.baseUrl = '';
    }
  }
  async run_auto_excluder(form_data_json: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    let cacheBuster = Date.now();
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/runAutoExcluder?cb=" + cacheBuster, form_data_json, {headers: headers});
  }

  async run_manual_excluder(form_data_json: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    let cacheBuster = Date.now();
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/runManualExcluder?cb=" + cacheBuster, form_data_json, {headers: headers});
  }

  async file_upload(file_data: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/fileUpload", file_data, {headers: headers});
  }

  async get_config() {
    return this.httpClient.get<ReturnPromise>(this.baseUrl + "/api/getConfig");
  }

  async set_config(config_data: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/setConfig", config_data, {headers: headers});
  }

  async save_task(task_data: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/saveTask", task_data, {headers: headers});
  }

  async does_task_exist(task_name: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/doesTaskExist", task_name, {headers: headers});
  }

  async get_tasks_list() {
    return this.httpClient.get<ReturnPromise>(this.baseUrl + "/api/getTasksList");
  }

  async delete_task(task_id: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/deleteTask", task_id, {headers: headers});
  }

  async run_task_from_task_id(task_id: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/runTaskFromTaskId", task_id, {headers: headers});
  }

  async get_task(task_id: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/getTask", task_id, {headers: headers});
  }

  async get_schedule_list() {
    return this.httpClient.get<ReturnPromise>(this.baseUrl + "/api/getScheduleList");
  }

  async refresh_credentials() {
    return this.httpClient.get<ReturnPromise>(this.baseUrl + "/api/refreshCredentials");
  }

}
