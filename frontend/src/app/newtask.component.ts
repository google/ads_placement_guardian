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

import { FormGroup, FormBuilder } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router'

import { PostService, ReturnPromise } from './services/post.service';
import { DialogService } from './services/dialog.service';


@Component({
  selector: 'app-newtask',
  templateUrl: './newtask.component.html',
  styleUrls: ['./newtask.component.scss']
})
export class NewtaskComponent implements OnInit {
  formBuilder: any;
  gadsForm: FormGroup;
  paginationForm: FormGroup;
  loading: boolean = false;
  table_result: any[] = [];
  finalGadsFilter: string = "";
  orAndEnabled = false;
  conditionEnabled = true;
  no_data = false;
  exclude_count = 0;
  subs: any;
  isChecked: boolean = false;
  save_button="Save Task";
  task_id:string="";

  error_count = 0;
  task_name_error=false;
  gads_error = false;
  gads_error_msg = "";
  customer_id_error = false;
  gads_filter_error = false;
  yt_subscribers_error = false;
  yt_view_error = false;
  yt_video_error = false;
  yt_language_error = false;
  yt_country_error = false;

  pagination_start = 0;
  pagination_rpp = 10;
  excluded_only = false;

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  pagination_values = [
    ["10"],
    ["25"],
    ["50"],
    ["100"],
    ["200"],
    ["500"]
  ];

  reportDaysArray = [
    ["7", "last 7 days"],
    ["14", "last 14 days"],
    ["28", "last 28 days"],
    ["90", "last 3 months"]
    ,["720", "last 720 TESTING"]
  ];

  scheduleArray = [
    ["0", "Do Not Schedule"],
    ["1", "every 1 hour"],
    ["2", "every 2 hours"],
    ["4", "every 4 hours"],
    ["12", "every 12 hours"],
    ["24", "every 1 day"],
    ["48", "every 2 days"]
  ];

  gadsFieldsArray = [
    ["metrics.impressions", "Impressions"],
    ["metrics.clicks", "Clicks"],
    ["metrics.ctr", "CTR"],
    ["metrics.cost_micros", "Cost"],
    ["metrics.average_cpm", "Avg. CPM"],
    ["metrics.conversions", "Conversions"],
    ["metrics.cost_per_conversion", "CPA"],
    ["metrics.view_through_conversions", "View-Through Conversions"],
    ["metrics.video_views", "Video Views"],
    ["metrics.video_view_rate", "Video View Rate"]
  ];

  gadsOperatorsArray = [
    ["<", "less than"],
    [">", "greater than"],
    //["<=", "less than or equal to"],
    //[">=", "great than or equal to"],
    ["=", "equal to"],
    ["!=", "not equal to"]
  ];

  ytMetricOperatorsArray = [
    ["", "any"],
    ["<", "less than"],
    [">", "greater than"],
    ["<=", "less than or equal to"],
    [">=", "great than or equal to"],
    ["==", "equal to"],
    ["!=", "not equal to"]
  ];

  ytTextOperatorsArray = [
    ["", "any"],
    ["==", "equal to"],
    ["!=", "not equal to"]
  ];

  ytYesNoOperatorsArray = [
    ["", "any"],
    ["==False", "non-standard text"],
    ["==True", "standard text"]
  ];
  task_exists: any;
  file_exists: any;

  constructor(private snackbar: MatSnackBar, private service: PostService, private fb: FormBuilder, 
    private dialogService: DialogService, private route:ActivatedRoute) {
    this.gadsForm = this.fb.group({
      taskName: [''],
      gadsCustomerId: [''],
      daysAgo: [''],
      schedule: [''],
      gadsField: [''],
      gadsOperator: [''],
      gadsValue: [''],
      gadsFinalFilters: [''],
      ytSubscriberOperator: [''],
      ytSubscriberValue: [''],
      ytViewOperator: [''],
      ytViewValue: [''],
      ytVideoOperator: [''],
      ytVideoValue: [''],
      ytLanguageOperator: [''],
      ytLanguageValue: [''],
      ytCountryOperator: [''],
      ytCountryValue: [''],
      ytStandardCharValue: ['']
    });

    this.gadsForm.controls['daysAgo'].setValue(7);
    this.gadsForm.controls['schedule'].setValue(0);

    this.paginationForm = this.fb.group({
      paginationValue: ['']
    });

    this.paginationForm.controls['paginationValue'].setValue(this.pagination_rpp);

  }

  ngOnInit(): void {
    this.task_id="";
    this.route.queryParams
    .subscribe(params => {
      this.task_id = params['task'];
    }
  );
  }

  ngAfterViewInit(): void {
    if(this.task_id!=undefined && this.task_id!=""){
      this._populate_task_load(this.task_id);
    }
  }

  async _populate_task_load(task_id:string) {
    this.loading=true;
    let task_id_json = { 'task_id': task_id };
    (await this.service.get_task(JSON.stringify(task_id_json)))
      .subscribe({
        next: (response: ReturnPromise) => this._populate_task_fields(response),
        error: (err) => this._call_service_error(),
        complete: () => console.log("Completed")
      });
  }

  async _populate_task_fields(response: ReturnPromise) {

    let task_exists = (Object.entries(response).find(([k, v]) => {
      if(k=='file_name') {
        this.task_id=v;
      }
      if(k=='task_name') {
        this.gadsForm.controls['taskName'].setValue(v);
      }
      if(k=='customer_id') {
        this.gadsForm.controls['gadsCustomerId'].setValue(v);
      }
      if(k=='days_ago') {
        this.gadsForm.controls['daysAgo'].setValue(v);
      }
      if(k=='schedule') {
        this.gadsForm.controls['schedule'].setValue(v);
      }
      if(k=='gads_filter') {
        this.finalGadsFilter=v;
      }
      if(k=='yt_subscriber_operator') {
        this.gadsForm.controls['ytSubscriberOperator'].setValue(v);
      }
      if(k=='yt_subscriber_value') {
        this.gadsForm.controls['ytSubscriberValue'].setValue(v);
      }
      if(k=='yt_view_operator') {
        this.gadsForm.controls['ytViewOperator'].setValue(v);
      }
      if(k=='yt_view_value') {
        this.gadsForm.controls['ytViewValue'].setValue(v);
      }
      if(k=='yt_video_operator') {
        this.gadsForm.controls['ytVideoOperator'].setValue(v);
      }
      if(k=='yt_video_value') {
        this.gadsForm.controls['ytVideoValue'].setValue(v);
      }
      if(k=='yt_language_operator') {
        this.gadsForm.controls['ytLanguageOperator'].setValue(v);
      }
      if(k=='yt_language_value') {
        this.gadsForm.controls['ytLanguageValue'].setValue(v);
      }
      if(k=='yt_country_operator') {
        this.gadsForm.controls['ytCountryOperator'].setValue(v);
      }
      if(k=='yt_country_value') {
        this.gadsForm.controls['ytCountryValue'].setValue(v);
      }
      if(k=='yt_std_character') {
        this.gadsForm.controls['ytStandardCharValue'].setValue(v);
      }
    }));
    this.scheduleChange();
    this.loading=false;
  }

  openSnackBar(message: string, button: string, type: string) {
    this.snackbar.open(message, button, {
      duration: 10000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type]
    });
  }

  run_auto_excluder_form(auto_exclude: string) {
    if (this.validate_fields(false)) {
      this.pagination_start = 0;
      this.loading = true;
      let formRawValue = {
        'excludeYt': auto_exclude,
        'gadsCustomerId': this.gadsForm.controls['gadsCustomerId'].value,
        'daysAgo': this.gadsForm.controls['daysAgo'].value,
        'gadsFinalFilters': this.finalGadsFilter,
        'ytSubscriberOperator': this.gadsForm.controls['ytSubscriberOperator'].value,
        'ytSubscriberValue': this.gadsForm.controls['ytSubscriberValue'].value,
        'ytViewOperator': this.gadsForm.controls['ytViewOperator'].value,
        'ytViewValue': this.gadsForm.controls['ytViewValue'].value,
        'ytVideoOperator': this.gadsForm.controls['ytVideoOperator'].value,
        'ytVideoValue': this.gadsForm.controls['ytVideoValue'].value,
        'ytLanguageOperator': this.gadsForm.controls['ytLanguageOperator'].value,
        'ytLanguageValue': this.gadsForm.controls['ytLanguageValue'].value,
        'ytCountryOperator': this.gadsForm.controls['ytCountryOperator'].value,
        'ytCountryValue': this.gadsForm.controls['ytCountryValue'].value,
        'ytStandardCharValue': this.gadsForm.controls['ytStandardCharValue'].value
      };
      this._call_auto_service(JSON.stringify(formRawValue), auto_exclude);
    }
  }

  async _call_auto_service(formRawValue: string, auto_exclude: string) {
    this.loading = true;
    this.subs = (await this.service.run_auto_excluder(formRawValue))
      .subscribe({
        next: (response: ReturnPromise) => this._call_auto_service_success(response, auto_exclude),
        error: (err) => this._call_service_error(),
        complete: () => console.log("Completed")
      });
  }

  _call_auto_service_success(response: ReturnPromise, auto_exclude: string) {
    this.table_result = Object.values(response);
    if (this.table_result.length > 0) {
      this.table_result.sort((a, b) => (a.excludeFromYt < b.excludeFromYt) ? 1 : -1);
      this.no_data = false;
      this._run_exclude_count();
      if (auto_exclude == 'true') {
        this.openSnackBar("Successfully excluded " + this.exclude_count + " YouTube channels", "Dismiss", "success-snackbar");
      }
    }
    else {
      this.no_data = true;
      this.exclude_count = 0;
      this.openSnackBar("Successful run, but no data matches criteria", "Dismiss", "success-snackbar");
    }
    this.loading = false;
  }



  run_manual_excluder_form() {
    let yt_exclusion_list = [];
    for (let data of this.table_result) {
      if (data.excludeFromYt == 'true') {
        yt_exclusion_list.push(data.group_placement_view_placement);
      }
    }
    if (yt_exclusion_list.length > 0) {
      let formRawValue = {
        'gadsCustomerId': this.gadsForm.controls['gadsCustomerId'].value,
        'ytExclusionList': yt_exclusion_list
      }
      this._call_manual_service(JSON.stringify(formRawValue));
    }
  }

  async _call_manual_service(formRawValue: string) {
    this.loading = true;
    (await this.service.run_manual_excluder(formRawValue))
      .subscribe({
        next: (response: ReturnPromise) => this._call_manual_service_success(response),
        error: (err) => this._call_service_error(),
        complete: () => console.log("Completed")
      });
  }

  _call_manual_service_success(response: ReturnPromise) {
    this.openSnackBar("Successfully excluded " + response + " YouTube channels", "Dismiss", "success-snackbar");
    this.loading = false;
  }

  _call_service_error() {
    this.loading = false;
    this.openSnackBar("Error retreiving data. Check Customer ID, credentials, and you have saved your config then try again", "Dismiss", "error-snackbar");
  }


  async save_task() {
    if (this.validate_fields(true)) {
      if (this.task_id!=undefined && this.task_id!="") {
        this.dialogService.openConfirmDialog("Are you sure you want to update the current task with the new settings?\n\nThis will also update your schedule settings")
          .afterClosed().subscribe(res => {
            if(res) {
              this.loading = true;
              this._finalise_save_task(this.task_id);
            }
          });
      }
      else {
        this.dialogService.openConfirmDialog("Are you sure you want to save this task?\n\nThis will also create a schedule if you have selected a schedule setting")
          .afterClosed().subscribe(res => {
            if(res) {
              this.loading = true;
              this._finalise_save_task("");
            }
          });
      }
    }
  }

  async _finalise_save_task(task_id:string) {
    let formRawValue = {
      'task_id': task_id,
      'task_name': this.gadsForm.controls['taskName'].value,
      'customer_id': this.gadsForm.controls['gadsCustomerId'].value,
      'days_ago': this.gadsForm.controls['daysAgo'].value,
      'schedule': this.gadsForm.controls['schedule'].value,
      'gads_filter': this.finalGadsFilter,
      'yt_subscriber_operator': this.gadsForm.controls['ytSubscriberOperator'].value,
      'yt_subscriber_value': this.gadsForm.controls['ytSubscriberValue'].value,
      'yt_view_operator': this.gadsForm.controls['ytViewOperator'].value,
      'yt_view_value': this.gadsForm.controls['ytViewValue'].value,
      'yt_video_operator': this.gadsForm.controls['ytVideoOperator'].value,
      'yt_video_value': this.gadsForm.controls['ytVideoValue'].value,
      'yt_language_operator': this.gadsForm.controls['ytLanguageOperator'].value,
      'yt_language_value': this.gadsForm.controls['ytLanguageValue'].value,
      'yt_country_operator': this.gadsForm.controls['ytCountryOperator'].value,
      'yt_country_value': this.gadsForm.controls['ytCountryValue'].value,
      'yt_std_character': this.gadsForm.controls['ytStandardCharValue'].value
    };

    this._call_save_task_service(JSON.stringify(formRawValue));
  }

  async _call_save_task_service(taskFormValue: string) {
    (await this.service.save_task(taskFormValue))
      .subscribe({
        next: (response: ReturnPromise) => this._call_save_task_success(response),
        error: (err) => this.openSnackBar("Unknown error saving file", "Dismiss", "error-snackbar"),
        complete: () => this.loading = false
      });
  }

  async _call_save_task_success(response: ReturnPromise) {
    let schedule_text="";
    if(this.gadsForm.controls['schedule'].value!="0") {
      schedule_text=" and scheduled to run every "+this.gadsForm.controls['schedule'].value+" hours";
    }
    else {
      schedule_text=" and removed any schedules that were running"
    }
    this.openSnackBar("Successfully saved task '" + this.gadsForm.controls['taskName'].value + "' ("
    +response+")"+schedule_text, "Dismiss", "success-snackbar");
    this.task_id=""+response;
    this.loading = false;
  }

  async _call_save_task_error() {
    this.loading = false;
    this.openSnackBar("Unable to save task", "Dismiss", "error-snackbar");
  }

  _run_exclude_count() {
    this.exclude_count = 0;
    for (let data of this.table_result) {
      if (data.excludeFromYt == 'true') {
        this.exclude_count++;
      }
    }
  }

  excludeCheckChange(ytChannelId: string) {
    //this.table_result[ytChannelId].excludeFromYt = 'False';
    for (let i in this.table_result) {
      if (this.table_result[i]['group_placement_view_placement'] == ytChannelId) {
        this.table_result[i]['excludeFromYt'] = String(!(this.table_result[i]['excludeFromYt'] == 'true'));
      }
    }
    this._run_exclude_count();
  }

  validate_fields(full: boolean) {
    let error_count = 0;
    this.task_name_error=false;
    this.customer_id_error = false;
    this.gads_filter_error = false;
    this.yt_subscribers_error = false;
    this.yt_view_error = false;
    this.yt_video_error = false;
    this.yt_language_error = false;
    this.yt_country_error = false;
    if (full) {
      /*
      let format = /^[a-zA-Z0-9_-\s]+$/;
      if (!format.test(this.gadsForm.controls['taskName'].value)) {
        this.task_name_error=true;
        error_count++;
      }
      */
      if ((this.gadsForm.controls['taskName'].value).length ==0) {
        this.task_name_error=true;
        error_count++;
      }
    }
    let cus_id = this.gadsForm.controls['gadsCustomerId'].value;
    cus_id = cus_id.replace(new RegExp('-', 'g'), '');
    this.gadsForm.controls['gadsCustomerId'].setValue(cus_id);
    if (this.finalGadsFilter.endsWith("(") || this.finalGadsFilter.endsWith("AND")) {
      this.gads_filter_error = true;
      error_count++;
    }
    if (isNaN(Number(cus_id)) || cus_id == "") {
      this.customer_id_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytSubscriberValue'].value))) {
      this.yt_subscribers_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytViewValue'].value))) {
      this.yt_view_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytVideoValue'].value))) {
      this.yt_video_error = true;
      error_count++;
    }
    if ((this.gadsForm.controls['ytLanguageValue'].value).length != 2 && this.gadsForm.controls['ytLanguageValue'].value != "") {
      this.yt_language_error = true;
      error_count++;
    }
    if ((this.gadsForm.controls['ytCountryValue'].value).length != 2 && this.gadsForm.controls['ytCountryValue'].value != "") {
      this.yt_country_error = true;
      error_count++;
    }
    if (error_count == 0) { return true; }
    else {
      this.openSnackBar("Error in some of your fields. Please review and correct them", "Dismiss", "error-snackbar");
      return false;
    }
  }

  gadsAddFilter() {
    this.gads_error = false;
    if (isNaN(Number(this.gadsForm.controls['gadsValue'].value))) {
      this.gads_error = true;
      this.gads_error_msg="Needs to be a number";
    }
    else if (this.gadsForm.controls['gadsField'].value == "metrics.cost_per_conversion" &&
    (this.gadsForm.controls['gadsOperator'].value == "=" ||
    this.gadsForm.controls['gadsOperator'].value == "!=" ) &&
    this.gadsForm.controls['gadsValue'].value ==0)
    {
      this.gads_error = true;
      this.gads_error_msg="Cannot use CPA=/!=0 (use Conversions)";
    }
    else if (this.gadsForm.controls['gadsField'].value != "" &&
      this.gadsForm.controls['gadsOperator'].value != "" &&
      this.gadsForm.controls['gadsValue'].value != "" &&
      this.conditionEnabled) {
      let finalValue = this.gadsForm.controls['gadsValue'].value;
      if (this.gadsForm.controls['gadsField'].value == "metrics.average_cpm" ||
      this.gadsForm.controls['gadsField'].value == "metrics.cost_micros" ||
      this.gadsForm.controls['gadsField'].value == "metrics.cost_per_conversion")
      {
        finalValue = finalValue * 1000000;
      }
      if (!this.finalGadsFilter.endsWith("(") && this.finalGadsFilter != "") {
        this.finalGadsFilter += " ";
      }
      this.finalGadsFilter += this.gadsForm.controls['gadsField'].value + this.gadsForm.controls['gadsOperator'].value + finalValue;
      if (this.finalGadsFilter.includes(") OR (") && !this.finalGadsFilter.endsWith(")")) {
        this.finalGadsFilter += ")";
      }
      this.conditionEnabled = false;
      this.orAndEnabled = true;
    }

  }

  gadsAddOrAnd(andOr: string) {
    if (this.orAndEnabled) {
      if (andOr == "OR") {
        if (!this.finalGadsFilter.startsWith("(")) {
          this.finalGadsFilter = "(" + this.finalGadsFilter + ")";
        }
        this.finalGadsFilter += " OR (";
      }
      else {
        if (this.finalGadsFilter.endsWith(")")) {
          this.finalGadsFilter = this.finalGadsFilter.slice(0, this.finalGadsFilter.length - 1);
        }
        this.finalGadsFilter += " AND";
      }
      this.conditionEnabled = true;
      this.orAndEnabled = false;
    }
  }

  clearFilter() {
    this.conditionEnabled = true;
    this.orAndEnabled = false;
    this.finalGadsFilter = "";
    this.gads_filter_error = false;
  }


  pagination_next() {
    if (this.pagination_start + this.pagination_rpp < this.table_result.length) {
      this.pagination_start += this.pagination_rpp;
    }
  }
  pagination_prev() {
    if (this.pagination_start - this.pagination_rpp >= 0) {
      this.pagination_start -= this.pagination_rpp;
    }
  }

  paginationChange() {
    this.pagination_rpp = Number(this.paginationForm.controls['paginationValue'].value);
    this.pagination_start = 0;
  }

  scheduleChange() {
    if(this.gadsForm.controls['schedule'].value=="0")
    {
      this.save_button="Save Task";
    }
    else{
      this.save_button="Save and Schedule Task";
    }
  }

  duplicateTask()
  {
    this.task_id="";
    this.gadsForm.controls['taskName'].setValue("");
  }
}
