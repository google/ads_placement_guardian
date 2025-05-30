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

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PostService, ReturnPromise } from './services/post.service';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  loading: boolean = false;
  settingsForm: FormGroup;
  file_status = '';
  subs: any;
  hideAuth = true;
  mcc_list: any[] = [];

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private snackbar: MatSnackBar,
    private fb: FormBuilder,
    private service: PostService,
  ) {
    this.settingsForm = this.fb.group({
      gadsMccId: [''],
      emailAddress: [''],
      alwaysFetchYoutubePreviewMode: [''],
      saveToDB: [''],
    });
  }

  ngOnInit(): void {}

  async ngAfterViewInit() {
    this.loading = true;
    this.subs = (await this.service.get_config()).subscribe({
      next: (response: ReturnPromise) => this._parse_config(response),
      error: () => (this.file_status = 'Unknown error!'),
      complete: () => (this.loading = false),
    });
  }

  validate_fields() {
    const error_count = 0;
    if (error_count === 0) {
      return true;
    } else {
      this.openSnackBar(
        'Error in some of your fields. Please review and correct them',
        'Dismiss',
        'error-snackbar',
      );
      return false;
    }
  }

  _parse_config(response: ReturnPromise) {
    Object.entries(response).find(([k, v]) => {
      if (k === 'mcc_id') {
        this.settingsForm.controls['gadsMccId'].setValue(v);
        this.populate_mcc_ids();
      }
      if (k === 'email_address') {
        this.settingsForm.controls['emailAddress'].setValue(v);
      }
      if (k === 'save_to_db') {
        this.settingsForm.controls['saveToDB'].setValue(v);
      }
      if (k === 'always_fetch_youtube_preview_mode') {
        this.settingsForm.controls['alwaysFetchYoutubePreviewMode'].setValue(v);
      }
    });
  }

  async populate_mcc_ids() {
    this.subs = (await this.service.get_mcc_list()).subscribe({
      next: (response: ReturnPromise) => this._populate_mcc_list(response),
      error: () => (this.file_status = 'Unknown error!'),
      complete: () => (this.loading = false),
    });
  }

  async refresh_mcc_ids() {
    this.loading = true;
    this.subs = (await this.service.refresh_mcc_list()).subscribe({
      next: (response: ReturnPromise) => this._populate_mcc_list(response),
      error: () => (this.file_status = 'Unknown error!'),
      complete: () => (this.loading = false),
    });
  }

  _populate_mcc_list(response: ReturnPromise) {
    this.mcc_list = Object.values(response);
    this.mcc_list.sort((a, b) =>
      a.account_name.toLowerCase() > b.account_name.toLowerCase() ? 1 : -1,
    );
    this.loading = false;
  }

  async save_settings() {
    if (!this.validate_fields()) return;
    this.loading = true;
    let mcc_id = this.settingsForm.controls['gadsMccId'].value;
    mcc_id = mcc_id.replace(new RegExp('-', 'g'), '').trim();
    this.settingsForm.controls['gadsMccId'].setValue(mcc_id);

    const formRawValue = {
      mcc_id,
      email_address: this.settingsForm.controls['emailAddress'].value,
      save_to_db: this.settingsForm.controls['saveToDB'].value,
      always_fetch_youtube_preview_mode:
        this.settingsForm.controls['alwaysFetchYoutubePreviewMode'].value,
    };

    this.subs = (
      await this.service.set_config(JSON.stringify(formRawValue))
    ).subscribe({
      next: (response: ReturnPromise) => this._redirect(response),
      error: () =>
        this.openSnackBar(
          'Error updating settings',
          'Dismiss',
          'error-snackbar',
        ),
      complete: () => (this.loading = false),
    });
  }

  async migrate_old_tasks() {
    this.loading = true;
    this.subs = (await this.service.migrate_old_tasks()).subscribe({
      next: (response: ReturnPromise) =>
        this.openSnackBar(response.toString(), 'Dismiss', 'success-snackbar'),
      error: () =>
        this.openSnackBar(
          'Error migrating old tasks',
          'Dismiss',
          'error-snackbar',
        ),
      complete: () => (this.loading = false),
    });
  }

  _redirect(response: ReturnPromise) {
    const url = response.toString();
    if (url.includes('http')) {
      this.hideAuth = false;
      window.open(url, '_blank');
    } else {
      this.openSnackBar('Config Saved!', 'Dismiss', 'success-snackbar');
      if (this.mcc_list.length === 0) {
        this.populate_mcc_ids();
      }
    }
  }

  openSnackBar(message: string, button: string, type: string) {
    this.snackbar.open(message, button, {
      duration: 10000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type],
    });
  }
}
