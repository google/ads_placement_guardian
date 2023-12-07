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

import { FormGroup, FormBuilder, FormControl } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';

import { PostService, ReturnPromise } from './services/post.service';
import { DialogService } from './services/dialog.service';
import { saveAs } from 'file-saver'

interface Field {
  value: string;
  view: string,
  type: string
}

interface FieldGroup {
  disabled?: boolean;
  name: string;
  fields: Field[];
}

enum MetricType {
    Number = "numeric",
    String = "string",
  }

enum FilterField {
    Operator,
    Value,
  }

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
  column_headers: any[] = [];
  table_result: any[] = [];
  customer_list: any[] = [];
  finalGadsFilter: string = "";
  orAndEnabled = false;
  conditionEnabled = true;
  no_data = false;
  exclude_count = 0;
  subs: any;
  isChecked: boolean = false;
  save_button = "Save Task";
  task_id: string = "";
  taskOutput:any[] = [];
  email_alerts_hidden: boolean = true;
  manual_cid: boolean = false;
  cid_choice: string = "Enter manually";
  revSort: string = "";

  error_count = 0;
  task_name_error = false;
  filter_operator_error = false;
  filter_operator_error_msg = "";
  filter_value_error = false;
  filter_value_error_msg = "";
  gads_data_error = false;
  customer_id_error = false;
  lookback_error = false;
  from_lookback_error = false;
  gads_filter_error = false;
  memory_error = false;
  gads_filter_lock = true;
  data_youtube: boolean = true;
  data_display: boolean = true;
  data_mobile: boolean = true;

  pagination_start = 0;
  pagination_rpp = 10;
  excluded_only = false;
  filtersOpenState: boolean = true;


  date_from = "";
  date_to = "";

  isCheckAll: boolean = false;

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

  exclusionLevelArray = [
    ["AD_GROUP", "Ad Group"],
    ["CAMPAIGN", "Campaign"],
    ["ACCOUNT", "Account"]
  ];
  defaultExclusionLevel = this.exclusionLevelArray[0][0];
  selectedExclusionLevel = this.exclusionLevelArray[0][0];


  taskOutputArray = [
    ["EXCLUDE", "Exclude"],
    ["NOTIFY", "Notify"],
    ["EXCLUDE_AND_NOTIFY", "Both"]
  ];

  scheduleArray = [
      ["0", "Do not schedule"],
      ["1", "Every 1 hour"],
      ["2", "Every 2 hours"],
      ["4", "Every 4 hours"],
      ["12", "Every 12 hours"],
      ["24", "Every 1 day"],
      ["48", "Every 2 days"]
  ];

  relevantMetricArray: string[][] = [];
  allMetricArray: FieldGroup[] = [
    {name: "Dimensions",
      fields: [
        {value: "GOOGLE_ADS_INFO:account_name", view: "Account Name" , type:"string"},
        {value: "GOOGLE_ADS_INFO:campaign_name", view: "Campaign Name", type:"string"},
        {value: "GOOGLE_ADS_INFO:campaign_type", view: "Campaign Type", type:"string"},
        {value: "GOOGLE_ADS_INFO:campaign_sub_type", view: "Campaign Sub Type" , type:"string"},
        {value: "GOOGLE_ADS_INFO:ad_group_name", view: "AdGroup Name" , type:"string"},
      ],
    },
    {name: "Metrics",
      fields: [
        {value: "GOOGLE_ADS_INFO:impressions", view: "Impressions", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:clicks", view: "Clicks", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:ctr", view: "CTR", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:cost", view: "Cost", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:avg_cpm", view: "Avg. CPM", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:avg_cpc", view: "Avg. CPC", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:avg_cpv", view: "Avg. CPV", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:conversions", view: "Conversions", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:cost_per_conversion", view: "CPA", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:view_through_conversions", view: "View-Through Conversions", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:video_views", view: "Video Views", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:video_view_rate", view: "Video View Rate", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:conversions_from_interactions_rate", view: "Conversions Rate", type:"numeric"},
      ],
    },
    {name: "Conversion Split",
      fields: [
        {value: "GOOGLE_ADS_INFO:conversion_name", view: "Conversion Name", type:"string"},
        {value: "GOOGLE_ADS_INFO:cost_per_conversion_", view: "CPA for selected conversion(s)", type:"numeric"},
        {value: "GOOGLE_ADS_INFO:conversions_", view: "Selected conversion(s)", type:"string"},
      ],
    },
    {name: "YouTube Channel",
      fields: [
        {value: "YOUTUBE_CHANNEL_INFO:title", view: "Title", type:"string"},
        {value: "YOUTUBE_CHANNEL_INFO:description", view: "Description", type:"string"},
        {value: "YOUTUBE_CHANNEL_INFO:viewCount", view: "Video Views Count", type:"numeric"},
        {value: "YOUTUBE_CHANNEL_INFO:subscriberCount", view: "Subscriber Count", type:"numeric"},
        {value: "YOUTUBE_CHANNEL_INFO:videoCount", view: "Video Count", type:"numeric"},
      ],
    },
    {name: "YouTube Video",
      fields: [
        {value: "YOUTUBE_VIDEO_INFO:title", view: "Title", type:"string"},
        {value: "YOUTUBE_VIDEO_INFO:description", view: "Description", type:"string"},
        {value: "YOUTUBE_VIDEO_INFO:viewCount", view: "Video Views Count", type:"numeric"},
        {value: "YOUTUBE_VIDEO_INFO:subscriberCount", view: "Subscriber Count", type:"numeric"},
        {value: "YOUTUBE_VIDEO_INFO:videoCount", view: "Video Count", type:"numeric"},
      ],
    },
    {name: "Website Content",
      fields: [
        {value: "WEBSITE_INFO:title", view: "Title", type:"string"},
        {value: "WEBSITE_INFO:keywords", view: "Keywords", type:"string"},
        {value: "WEBSITE_INFO:description", view: "Description", type:"string"},
      ],
    }
  ];


  metricsByTypeDict: { [key: string]: Set<string> } = {};  
  numericOperators: Set<string | null > = new Set(["<", ">", "=", "!="]);
  stringOperators: Set<string | null> = new Set(["contains", "regexp", "=", "!="]);

  gadsOperatorsArray = [
    ["<", "less than"],
    [">", "greater than"],
    ["=", "equal to"],
    ["!=", "not equal to"],
    ["contains", "Contains"],
    ["regexp", "Match regexp"],
  ];

  user_visible_columns: string[] = [];

  hidden_columns: any[] = [
    "campaign_id",
    "ad_group_id",
    "criterion_id",
    "customer_id",
    "account_id",
    "placement",
    "url",
    "extra_info"
  ];
  value_columns: any[] = [
    "cost",
    "avg_cpc",
    "avg_cpm",
    "avg_cpv",
    "video_view_rate",
    "ctr",
    "cost_per_conversion",
    "cost_per_all_conversion",
    "all_conversion_rate",
    "interaction_rate",
    "conversions_from_interactions_rate"
  ];

  user_hidden_columns_by_defualt: any[] = [
    "criterion_id"
  ];

  task_exists: any;
  file_exists: any;

  selectedCidList = new FormControl(['']);
  selectedSchedule = new FormControl('0');
  selectedExclusionLevelFormControl = new FormControl('AD_GROUP');
  selectedField = new FormControl('');
  selectedTaskOutput = new FormControl('EXCLUDE_AND_NOTIFY');
  selectedOperator = new FormControl('');
  selectedValue = new FormControl('');

  constructor(private snackbar: MatSnackBar, private service: PostService, private fb: FormBuilder,
      private dialogService: DialogService, private route: ActivatedRoute) {
      this.gadsForm = this.fb.group({
          taskName: [''],
          gadsCustomerId: [''],
          fromDaysAgo: [''],
          lookbackDays: [''],
          exclusionLevel: [''],
          task_output: [''],
          schedule: [''],
          gadsDataYouTube: [''],
          gadsDataDisplay: [''],
          gadsDataMobile: [''],
          gadsField: [''],
          gadsOperator: [''],
          gadsValue: [''],
          gadsFinalFilters: [''],
          date_from: "",
          date_to: ""
      });

      this.gadsForm.controls['lookbackDays'].setValue(7);
      this.gadsForm.controls['fromDaysAgo'].setValue("0");
      this.selectedSchedule.setValue('0');

     this.fillUserVisibilColumnDropDown();

     this.paginationForm = this.fb.group({
          paginationValue: ['']
      });

      this.paginationForm.controls['paginationValue'].setValue(this.pagination_rpp);
      this.initMetricsByTypeDict();
  }

    private fillUserVisibilColumnDropDown() {
        this.hidden_columns.forEach(column => {
            this.user_visible_columns.push(column); 
        });

        this.value_columns.forEach(column => {
            this.user_visible_columns.push(column);
        });

        this.user_hidden_columns_by_defualt.forEach(column => {
            this.user_visible_columns.push(column);
        });
    }

  initMetricsByTypeDict() {
        if (!this.metricsByTypeDict || Object.keys(this.metricsByTypeDict).length == 0){
        this.allMetricArray.forEach((fieldGroup) => {
            fieldGroup.fields.forEach((field) => {
            if (!this.metricsByTypeDict[field.type]) {
                this.metricsByTypeDict[field.type] = new Set<string>();
            }
            this.metricsByTypeDict[field.type].add(field.value);
            });
        });
      }
    }

  ngOnInit(): void {
      this.task_id = "";
      this.route.queryParams
          .subscribe(params => {
              this.task_id = params['task'];
          });

      this._populate_customer_list();
  }

  ngAfterViewInit(): void {
      if (this.task_id != undefined && this.task_id != "") {
          this._populate_task_load(this.task_id);
      }
  }

  async _populate_customer_list() {
      this.loading = true;
      this.gadsForm.controls['gadsCustomerId'].disable();
      (await this.service.get_customer_list())
      .subscribe({
          next: (response: ReturnPromise) => this._customer_list_populated(response),
          error: (err) => this._call_service_error(err),
          complete: () => console.log("Completed")
      });
  }

  async _customer_list_populated(response: ReturnPromise) {
      this.customer_list = Object.values(response);
      this.customer_list.sort((a, b) => (a.account_name.toLowerCase() > b.account_name.toLowerCase()) ? 1 : -1);

      this.gadsForm.controls['gadsCustomerId'].enable();
      this.loading = false;
  }

  async _populate_task_load(task_id: string) {
      this.loading = true;
      let task_id_json = {
          'task_id': task_id
      };
      (await this.service.get_task(JSON.stringify(task_id_json)))
      .subscribe({
          next: (response: ReturnPromise) => this._populate_task_fields(response),
          error: (err) => this._call_service_error(err),
          complete: () => console.log("Completed")
      });
  }

  async _populate_task_fields(response: ReturnPromise) {
      let task_exists = (Object.entries(response).find(([k, v]) => {
          if (k == 'file_name') {
              this.task_id = v;
          }
          if (k == 'name') {
              this.gadsForm.controls['taskName'].setValue(v);
          }
          if (k == 'customer_ids') {
              this.selectedCidList.setValue(v.split(","));
          }
          if (k == 'from_days_ago') {
              this.gadsForm.controls['fromDaysAgo'].setValue(v);
          }
          if (k == 'date_range') {
              this.gadsForm.controls['lookbackDays'].setValue(v);
          }
          else if (k == 'date_range') { //To be backwards compatible for older tasks
              this.gadsForm.controls['lookbackDays'].setValue(v);
          }
          if (k == 'exclusion_level') {
            this.selectedExclusionLevelFormControl.setValue(v.replace("ExclusionLevelEnum.", ""));
          }
          if (k == 'output') {
            this.selectedTaskOutput.setValue(v.replace("TaskOutput.", ""));
          }
          if (k == 'schedule') {
              // TODO: convert crontab to variable
              this.selectedSchedule.setValue(v);
          }
          if (k == 'exclusion_rule') {
            this.finalGadsFilter = v;
            if(v != "") {
              this.conditionEnabled = false;
              this.orAndEnabled = true;
            }
          }
          if (k == 'placement_types') {
            if (!v.includes('YOUTUBE')) {
                this.gadsForm.controls['gadsDataYouTube'].setValue(false);
            }
            if (!v.includes('MOBILE')) {
                this.gadsForm.controls['gadsDataMobile'].setValue(false);
            }
            if (!v.includes('WEBSITE')) {
                this.gadsForm.controls['gadsDataDisplay'].setValue(false);
            }
          }
      }));
      this.scheduleChange();
      this.loading = false;
  }


  openSnackBar(message: string, button: string, type: string) {
    let dur = 10000;
    if(type=="error-snackbar") { dur = 0; }
    this.snackbar.open(message, button, {
      duration: dur,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type]
    });
  }

  previewPlacements() {
      if (this.validate_fields(false)) {
          this.pagination_start = 0;
          var placement_types = [];
          if (this.data_youtube) {
            placement_types.push("YOUTUBE_CHANNEL", "YOUTUBE_VIDEO");
          }
          if (this.data_display) {
            placement_types.push("WEBSITE");
          }
          if (this.data_mobile) {
            placement_types.push("MOBILE_APPLICATION", "MOBILE_APP_CATEGORY");
          }
          let formRawValue = {
            'customer_ids': this.selectedCidList.value,
            'from_days_ago': this.gadsForm.controls['fromDaysAgo'].value,
            'date_range': this.gadsForm.controls['lookbackDays'].value,
            'exclusion_level': this.selectedExclusionLevelFormControl.value,
            'exclusion_rule': this.finalGadsFilter,
            'placement_types': placement_types.toString(),
          };
          if (this.finalGadsFilter == "") {
              this.dialogService.openConfirmDialog("WARNING: Are you sure you want to run with no Google Ads Filters?\n\nThis can take considerably longer on larger accounts and even run out of memory. It is advised to add filters for best results.")
                  .afterClosed().subscribe(res => {
                      if (res) {
                          this.loading = true;
                          this._call_auto_service(JSON.stringify(formRawValue));
                      }
                  });
          } else {
              this.loading = true;
              this._call_auto_service(JSON.stringify(formRawValue));
          }
      }
  }

  async _call_auto_service(formRawValue: string) {
      this.loading = true;
      this.subs = (await this.service.preview_form(formRawValue))
          .subscribe({
              next: (response: ReturnPromise) => this._call_auto_service_success(response),
              error: (err) => this._call_service_error(err),
              complete: () => console.log("Completed")
          });
  }

  _call_auto_service_success(response: ReturnPromise) {
      const jsonResponse = JSON.parse(JSON.stringify(response));
      if (!jsonResponse.data) {
          this.handleEmptyTable("Server error, please investigate the cloud logs", "error-snackbar");
          return;
      }
      if (!jsonResponse.data){
        this.handleEmptyTable("Server error, please investigate the cloud logs", "error-snackbar");
        return;
      }
      const flattened_raw_response = [];
      for (const raw_data_row_obj of Object.values(jsonResponse.data)){
        let raw_data_row = JSON.parse(JSON.stringify(raw_data_row_obj));
        flattened_raw_response.push({ ...raw_data_row});
      }
      const dates = jsonResponse["dates"];
      this.date_from = dates["date_from"];
      this.date_to = dates["date_to"];
      this.table_result = flattened_raw_response;
      if (this.table_result.length > 0) {
        this.column_headers = Object.keys(jsonResponse.data['0']);
        this.sort_table("default");
        this.no_data = false;
      } else {
        this.handleEmptyTable("Successful run, but no data matches criteria", "success-snackbar");
      }
      this.loading = false;
  }


  private handleEmptyTable(message: string, css_class: string) {
      this.no_data = true;
      this.exclude_count = 0;
      this.openSnackBar(message, "Dismiss", css_class);
      this.loading = false;
  }

  sort_table(element: string) {
      if (element == "default") {
          this.table_result.sort((a, b) => (a.allowlist > b.allowlist) ? 1 : -1);
          this.table_result.sort((a, b) => (a.exclude_from_account > b.exclude_from_account) ? 1 : -1);
          this.table_result.sort((a, b) => (a.excluded_already > b.excluded_already) ? 1 : -1);
          this.revSort = "";
      } else if (this.revSort == element) {
          this.table_result.sort((a, b) => (a[element] > b[element]) ? 1 : -1);
          this.revSort = "";
      } else {
          this.table_result.sort((a, b) => (a[element] < b[element]) ? 1 : -1);
          this.revSort = element;
      }
  }

  runManualExcludeForm() {
    let exclusion_list: Object[][] = [];
    for (let data of this.table_result) {
      if (data.exclude_from_account && !data.excluded_already && !data.allowlist) {
        exclusion_list.push(Object.values(data));
      }
    }
    if (exclusion_list.length > 0) {
        if (this.data_youtube && this.selectedExclusionLevelFormControl.value != "ACCOUNT" ){
            this.dialogService.openConfirmDialog("For now, CPR tool can exclude video placements at an account level only (regardless of 'success' indication). Do you wish to proceed?")
            .afterClosed().subscribe(res => {
                if (res) {
                    this.manualExcludeConfirmed(exclusion_list);
                }
            });
        }
        else{
            this.manualExcludeConfirmed(exclusion_list);
        }
    }
  }

  manualExcludeConfirmed(exclusion_list: Object[][]) {
    let formRawValue = {
        'customer_ids': this.selectedCidList.value,
        'header': this.column_headers,
        'placements': exclusion_list
    };
    this._call_manual_service(JSON.stringify(formRawValue));
}

  //the call to the server
  async _call_manual_service(formRawValue: string) {
      this.loading = true;
      (await this.service.run_manual_excluder(formRawValue))
      .subscribe({
          next: (response: ReturnPromise) => this._call_manual_service_success(response),
          error: (err) => this._call_service_error(err),
          complete: () => console.log("Completed")
      });
  }

  _call_manual_service_success(response: ReturnPromise) {
      this._run_exclude_count(true);
      this.openSnackBar("Successfully excluded " + response + " placement(s)", "Dismiss", "success-snackbar");
      this.loading = false;
  }

  _call_service_error(err: ErrorEvent) {
      this.loading = false;
      this.openSnackBar("Error - This could be due to credential issues or filter issues. Check your credentials and any manual edits to your filters", "Dismiss", "error-snackbar");
  }


  async save_task() {
      let warning = "";
      if (this.finalGadsFilter == "" && this.selectedSchedule.value != '0') {
          warning = "WARNING: Are you sure you want to schedule a task with no Google Ads Filters?\n\nThis can take considerably longer on larger accounts and even run out of memory. It is advised to add filters for best results.\n\n";
      }
      if (this.validate_fields(true)) {
          if (this.task_id != undefined && this.task_id != "") {
              this.dialogService.openConfirmDialog(warning + "Are you sure you want to update the current task with the new settings?\n\nThis will also update your schedule settings")
                  .afterClosed().subscribe(res => {
                      if (res) {
                          this.loading = true;
                          this._finalise_save_task(this.task_id);
                      }
                  });
          } else {
              this.dialogService.openConfirmDialog(warning+"Are you sure you want to save this task?\n\nThis will also create a schedule if you have selected a schedule setting")
                .afterClosed().subscribe(res => {
                  if (res) {
                    this.loading = true;
                    this._finalise_save_task(this.task_id);
                      }
                  });
          }
      }
  }

  async _finalise_save_task(task_id: string) {
      var placement_types = [];
      if (this.data_youtube) {
        placement_types.push("YOUTUBE_CHANNEL", "YOUTUBE_VIDEO");
      }
      if (this.data_display) {
        placement_types.push("WEBSITE");
      }
      if (this.data_mobile) {
        placement_types.push("MOBILE_APPLICATION", "MOBILE_APP_CATEGORY");
      }
      let formRawValue = {
          'task_id': task_id,
          'name': this.gadsForm.controls['taskName'].value,
          'customer_ids': this.selectedCidList.value?.join(","),
          'exclusion_rule': this.finalGadsFilter,
          'output': this.selectedTaskOutput.value,
          'from_days_ago': this.gadsForm.controls['fromDaysAgo'].value,
          'date_range': this.gadsForm.controls['lookbackDays'].value,
          'exclusion_level': this.selectedExclusionLevelFormControl.value,
          'schedule': this.selectedSchedule.value,
          'placement_types': placement_types.toString(),
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
      let schedule_text = "";
      if (this.gadsForm.controls['schedule'].value != "0") {
          schedule_text = " and scheduled to run every " + this.gadsForm.controls['schedule'].value + " hours";
      } else {
          schedule_text = " and removed any schedules that were running"
      }
      this.openSnackBar("Successfully saved task '" + this.gadsForm.controls['taskName'].value + "' (" +
          response + ")" + schedule_text, "Dismiss", "success-snackbar");
      this.task_id = "" + response;
      this.loading = false;
  }

  async _call_save_task_error() {
      this.loading = false;
      this.openSnackBar("Unable to save task", "Dismiss", "error-snackbar");
  }

  _run_exclude_count(edit_table: boolean) {
      this.exclude_count = 0;
      this.memory_error = false;
      for (let i in this.table_result) {
          if (this.table_result[i]['exclude_from_account'] &&
              !this.table_result[i]['excluded_already'] &&
              !this.table_result[i]['allowlist']) {
              this.exclude_count++;
              if (edit_table) {
                  this.table_result[i]['excluded_already'] = true;
                  this.exclude_count--;
              }
          }
          if (this.table_result[i]['memory_warning'] != null) {
              this.memory_error = true;
          }
      }
      //this.sort_table("default");
  }

  row_class(excluded_already: boolean, exclude_from_account: boolean, allowlist: boolean) {
      if (allowlist) {
          return "allowlisted";
      }
      if (excluded_already) {
          return "alreadyexcluded";
      } else if (exclude_from_account) {
          return "tobeexcluded";
      } else {
          return "";
      }
  }

  toggleCheckAll(value: boolean) {
      for (let i in this.table_result) {
          this.table_result[i]['exclude_from_account'] = value;
      }
      this._run_exclude_count(false);
  }

  excludeCheckChange(placementName: string, exclude_from_account: boolean) {
       for (let i in this.table_result) {
           if (this.table_result[i]['placement'] == placementName) {
              this.table_result[i]['exclude_from_account'] = !exclude_from_account;
           }
       }
      this._run_exclude_count(false);
  }

  validate_fields(full: boolean) {
      let error_count = 0;
      this.task_name_error = false;
      this.customer_id_error = false;
      this.lookback_error = false;
      this.gads_filter_error = false;
      this.from_lookback_error = false;
      this.gads_data_error = false;
      if (full) {
          if ((this.gadsForm.controls['taskName'].value).length == 0) {
              this.task_name_error = true;
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
      if (isNaN(Number(this.gadsForm.controls['lookbackDays'].value)) || this.gadsForm.controls['lookbackDays'].value == "" || Number(this.gadsForm.controls['lookbackDays'].value) > 90) {
          this.lookback_error = true;
          error_count++;
      }
      if (isNaN(Number(this.gadsForm.controls['fromDaysAgo'].value)) || this.gadsForm.controls['fromDaysAgo'].value == "" || Number(this.gadsForm.controls['fromDaysAgo'].value) > 90) {
          this.from_lookback_error = true;
          error_count++;
      }
      if (cus_id == "") {
          this.customer_id_error = true;
          error_count++;
      }
      if (!this.data_display && !this.data_youtube && !this.data_mobile) {
          this.gads_data_error = true;
          error_count++;
      }
      if (error_count == 0) {
          return true;
      } else {
          // this.openSnackBar("Error in some of your fields. Please review and correct them", "Dismiss", "error-snackbar");
          return true;
      }
  }

  gadsAddFilter() {
    this.filter_operator_error = false;
    this.filter_value_error = false;
    let selected_field = this.selectedField.value?? "";
    let operator = this.selectedOperator.value?? "";
    let field_value = this.selectedValue.value?? "";
    const showError = (feild :FilterField ,msg: string) => {        
        if (feild == FilterField.Operator) {
            this.filter_operator_error = true;
            this.filter_operator_error_msg = msg;
        } else{
            this.filter_value_error = true;
            this.filter_value_error_msg = msg;
        }        
    }
    if (this.metricsByTypeDict[MetricType.Number].has(selected_field)){
        if (!this.numericOperators.has(operator)){
        showError(FilterField.Operator, "Not compatible with the selected field");
        }
        if (isNaN(Number(field_value))){
            showError(FilterField.Value, "Should be numeric");
        }
    } else if (this.metricsByTypeDict[MetricType.String].has(selected_field)){
        if (!this.stringOperators.has(operator)){
            showError(FilterField.Operator, "Not compatible with the selected field");
            }
            if (Number(field_value)){
                showError(FilterField.Value, "Please type in not just digits");
            }
    } else if (isNaN(Number(field_value)) && !operator?.includes("regex") && !operator?.includes("contains")) {
        showError(FilterField.Value, "Should be numeric");
    } 
    
    if (!(this.filter_operator_error || this.filter_value_error)){
        this.fixFilterSyntax(selected_field, operator, field_value);
    }
  }

    private fixFilterSyntax(selected_field: string, operator: string, field_value: string) {
        if (selected_field != "" && operator != "" && field_value != "" && this.conditionEnabled) {
            let finalValue = field_value;
            if (!this.finalGadsFilter.endsWith("(") && this.finalGadsFilter != "") {
                this.finalGadsFilter += " ";
            }
            this.finalGadsFilter += selected_field + " " + operator + " " + finalValue;
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
          } else {
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
      this.dialogService.openConfirmDialog("Are you sure you want to clear your current Google Ads filters?")
          .afterClosed().subscribe(res => {
              if (res) {
                  this.conditionEnabled = true;
                  this.orAndEnabled = false;
                  this.finalGadsFilter = "";
                  this.gads_filter_error = false;
              }
          });
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
      if (this.selectedSchedule.value == "0") {
          this.save_button = "Save Task";
          this.email_alerts_hidden = true;
          this.taskOutput = ["EXCLUDE_AND_NOTIFY", "Both"];
      } else {
          this.save_button = "Save and Schedule Task";
          this.email_alerts_hidden = false;
      }
  }

  duplicateTask() {
      this.task_id = "";
      this.gadsForm.controls['taskName'].setValue("");
  }

  switch_cid() {
      this.manual_cid = !this.manual_cid;
      if (this.manual_cid) {
          this.cid_choice = "Pick from List";
      } else {
          this.cid_choice = "Enter manually";
      }
  }

  unlockFilter() {
      this.gads_filter_lock = !this.gads_filter_lock;
  }

  downloadCSV() {
      let data = this.table_result;
      const header = Object.keys(data[0]);
      let csv = data.map(row => header.map(fieldName => JSON.stringify(row[fieldName])).join(','));
      csv.unshift(header.join(','));
      let csvArray = csv.join('\r\n');

      var blob = new Blob([csvArray], {
          type: 'text/csv'
      })
      saveAs(blob, "cpr_export.csv");
  }

  async addToAllowlist(placementType: string, placementName: string, accountId: string) {
      this.loading = true;
      let placement_id = {
          'type': placementType,
          'name': placementName,
          'account_id': accountId
      };
      (await this.service.add_to_allowlist(JSON.stringify(placement_id)))
      .subscribe({
          next: (response: ReturnPromise) => this.loading = false,
          error: (err) => this.openSnackBar("Unknown error adding to allowlist", "Dismiss", "error-snackbar"),
          complete: () => this.loading = false
      });

      for (let i in this.table_result) {
          if (this.table_result[i]['placement'] == placementName) {
              this.table_result[i]['allowlist'] = true;
              this.table_result[i]['excluded_already'] = false;
          }
      }
      this._run_exclude_count(false);
  }

  async removeFromAllowlist(placementType: string, placementName: string, accountId: string) {
      let placement_id = {
          'type': placementType,
          'name': placementName,
          'account_id': accountId
      };
      (await this.service.remove_from_allowlist(JSON.stringify(placement_id)))
      .subscribe({
          next: (response: ReturnPromise) => this.loading = false,
          error: (err) => this.openSnackBar("Unknown error removing from allowlist", "Dismiss", "error-snackbar"),
          complete: () => this.loading = false
      });

      for (let i in this.table_result) {
          if (this.table_result[i]['placement'] == placementName) {
              this.table_result[i]['allowlist'] = false;
          }
      }
      this._run_exclude_count(false);
  }

  onFilterToggleChanged() {
    // let filteredItems: string[][] = this.allMetricArray.slice();
    // if (!this.data_youtube) {
    //   filteredItems = filteredItems.filter(item => !item[0].startsWith('YOUTUBE_CHANNEL_INFO'));
    // }
    // if (!this.data_display) {
    //   filteredItems = filteredItems.filter(item => !item[0].startsWith('WEBSITE_INFO'));
    // }
    // if (!this.data_mobile) {
    //     filteredItems = filteredItems.filter(item => !item[0].startsWith('MOBILE'));
    //   }
    // this.relevantMetricArray = filteredItems;
  }
  unsorted(a: any, b: any): number { return 0; }
  formatNumber(val: any, pct: boolean = false): any {
    if (typeof val === 'number') {
      if (Math.floor(val) == val) {
        return val;
      } else {
        if (pct) {
          return Math.round(val * 100  * 10) / 10 + "%";
        } else {
          return Math.round(val * 10) / 10;
        }
        return
      }
    } else {
      return val;
    };
  }
  togglePanel() {
        this.filtersOpenState = !this.filtersOpenState
  }
}

