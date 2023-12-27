#!/bin/bash
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


SCRIPT_PATH=$(readlink -f "$0" | xargs dirname)
COLOR='\033[0;36m' # Cyan
RED='\033[0;31m' # Red Color
NC='\033[0m' # No Color

SETTING_FILE="${SCRIPT_PATH}/settings.ini"
PROJECT_ID=$(gcloud config get-value project 2> /dev/null)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID | grep projectNumber | sed "s/.* '//;s/'//g")
PROJECT_ALIAS=$(git config -f $SETTING_FILE config.name)
GCS_BASE_PATH=gs://$PROJECT_ID/$PROJECT_ALIAS
CF_REGION=$(git config -f $SETTING_FILE functions.region)
USER_EMAIL=$(gcloud config get-value account 2> /dev/null)
SERVICE_ACCOUNT=$PROJECT_ID@appspot.gserviceaccount.com

convert_answer() {
  answer="$1"
  echo ${answer:-y} | tr '[:upper:]' '[:lower:]' | cut -c1
}

check_ads_config() {
	echo -e "\n${COLOR}Setting up Google Ads authentication...${NC}"
  if [[ -f "./google-ads.yaml" ]]; then
    echo -n "Would you like to use google-ads.yaml (Y/n)?: "
    read -r use_google_ads_config
    use_google_ads_config=$(convert_answer $use_google_ads_config 'Y')
    ads_config=google-ads.yaml
  elif [[ -f "$HOME/google-ads.yaml" ]]; then
    echo -n "Would you like to use ~/google-ads.yaml (Y/n)?: "
    read -r use_google_ads_config
    use_google_ads_config=$(convert_answer $use_google_ads_config 'Y')
    ads_config=$HOME/google-ads.yaml
  fi

  if [[ $use_google_ads_config != 'y' ]]; then
		echo -e "\n${COLOR}Unable to find (or use) existing google-ads.yaml, building it from scratch.${NC}"
    # entering credentials one by one
    read -p "developer_token (from your Google Ads account): " -r DEVELOPER_TOKEN
    read -p "OAuth client id: " -r OAUTH_CLIENT_ID
    read -p "OAuth client secret: " -r OAUTH_CLIENT_SECRET
    echo "See details on how to generate a refresh token here: https://github.com/google/ads-api-report-fetcher/blob/main/docs/how-to-authenticate-ads-api.md"
    read -p "refresh_token: " -r REFRESH_TOKEN
    read -p "login_customer_id (MCC): " -r MCC_ID
    ads_config=google-ads.yaml
    if [[ -f "./google-ads.yaml" ]]; then
      read -p "File google-ads.yaml already exists, do you want to overwrite it (Y/n)? " -r overwrite
      overwrite=$(convert_answer $overwrite 'Y')
      if [[ $overwrite = 'n' ]]; then
        read -p "Enter a file name for your google-ads.yaml: " -r ads_config
      fi
    fi
    echo "# google-ads.yaml was auto-generated by installer (run-local.sh) ${date}
developer_token: ${DEVELOPER_TOKEN}
client_id: ${OAUTH_CLIENT_ID}
client_secret: ${OAUTH_CLIENT_SECRET}
refresh_token: ${REFRESH_TOKEN}
login_customer_id: ${MCC_ID}
use_proto_plus: True
    " > $ads_config
  fi
}

check_billing_enabled() {
	BILLING_ENABLED=$(gcloud beta billing projects describe $PROJECT_ID --format="csv(billingEnabled)" | tail -n 1)
	if [[ "$BILLING_ENABLED" = 'False' ]]
	then
			echo -e "${RED}The project $PROJECT_ID does not have a billing enabled. Please activate billing${NC}"
				exit
	fi
}

deploy_cloud_functions() {
	echo -e "${COLOR}Deploying cloud functions...${NC}"
	_deploy_cf "create_task_schedule" "${PROJECT_ALIAS}_task_created"
	_deploy_cf "update_task_schedule" "${PROJECT_ALIAS}_task_updated"
	_deploy_cf "delete_task_schedule" "${PROJECT_ALIAS}_task_deleted"
}

_deploy_cf() {
	CF_NAME=$1
	TOPIC=$2
	gcloud functions deploy "${PROJECT_ALIAS}_${CF_NAME}" \
		--trigger-topic=$TOPIC \
		--entry-point=handle_event \
		--runtime=python311 \
		--timeout=540s \
		--region=$CF_REGION \
		--quiet \
		--gen2 \
		--source=$SCRIPT_PATH/cloud_functions/$CF_NAME
	echo -e "${COLOR}\tCloud function $CF_NAME is deployed.${NC}"
}

create_topics() {
	echo -e "${COLOR}Creating PubSub topics...${NC}"
	for topic in "task_created" "task_deleted" "task_updated"; do
		_create_topic "${PROJECT_ALIAS}_${topic}"
	done
}

_create_topic() {
	TOPIC=$1
	TOPIC_EXISTS=$(gcloud pubsub topics list --filter="name=projects/'$PROJECT_ID'/topics/'$TOPIC'" --format="get(name)")
	if [[ ! -n $TOPIC_EXISTS ]]; then
		gcloud pubsub topics create $TOPIC
		echo -e "${COLOR}\tTopic $TOPIC is created.${NC}"
	fi
}

enable_api() {
	echo -e "${COLOR}Enabling APIs...${NC}"
	gcloud services enable appengine.googleapis.com
	gcloud services enable iap.googleapis.com
	gcloud services enable apikeys.googleapis.com
	gcloud services enable cloudresourcemanager.googleapis.com
	gcloud services enable iamcredentials.googleapis.com
	gcloud services enable cloudbuild.googleapis.com
	gcloud services enable firestore.googleapis.com
	gcloud services enable googleads.googleapis.com
	gcloud services enable youtube.googleapis.com
	gcloud services enable cloudscheduler.googleapis.com
}

deploy_app() {
	echo -e "${COLOR}Deploying app to GAE...${NC}"
	cd $SCRIPT_PATH/../backend
  sed -i'.bak' -e "s^path/to/google-ads.yaml^$GCS_BASE_PATH/google-ads.yaml^" app.yaml
  sed -i'.bak' -e "s^your-youtube-api-key^$youtube_api_key^" app.yaml
	gcloud app deploy -q
	cd $SCRIPT_PATH
}

build_frontend() {
	echo -e "${COLOR}Building app...${NC}"
	cd $SCRIPT_PATH/../frontend
	NODE_VER=18
	if [[ "$CLOUD_SHELL" == "true" ]]; then
			sudo su -c '. /usr/local/nvm/nvm.sh && nvm install $NODE_VER --lts'
				. /usr/local/nvm/nvm.sh && nvm use $NODE_VER
	fi
	export NG_CLI_ANALYTICS=ci
	npm install --no-audit
	npm run build
	cd ..
	cd backend/static
	mkdir img
	cd ..
	cp img/gtechlogo.png static/img/gtechlogo.png
}

create_datastore() {
	DB_NAME=channel-placement-excluder
	DB_EXISTS=$(gcloud firestore databases list --filter="name=projects/'$PROJECT_ID'/databases/'$DB_NAME'" --format="get(name)")
	if [[ ! -n $DB_EXISTS ]]; then
		echo -e "\n${COLOR}Creating Datastore...${NC}"
		gcloud firestore databases create \
			--database=$DB_NAME \
			--location=eur3 \
			--type=datastore-mode
	else
		echo -e "\n${COLOR}Datastore exists.${NC}"
	fi
}

update_permissions() {
	# Grant GAE service account with the Service Account Token Creator role so it could create GCS signed urls
	gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SERVICE_ACCOUNT --role=roles/iam.serviceAccountTokenCreator
	gcloud projects add-iam-policy-binding $PROJECT_ID \
		--member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
		--role="roles/cloudscheduler.jobRunner"
	gcloud projects add-iam-policy-binding $PROJECT_ID \
		--member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
		--role="roles/editor"
}

create_oauth_for_iap() {
	# create OAuth client for IAP
	echo -e "${COLOR}Creating OAuth client for IAP...${NC}"
	gcloud iap oauth-clients create projects/$PROJECT_NUMBER/brands/$PROJECT_NUMBER \
	--display_name=iap \
	--format=json
	# --format=json 2> /dev/null |\
	# 	python3 -c "import sys, json; res=json.load(sys.stdin); i = res['name'].rfind('/'); print(res['name'][i+1:]); print(res['secret'])" \
	# 		> .oauth
		# Now in .oauth file we have two line, first client id, second is client secret
	lines=()
	while IFS= read -r line; do lines+=("$line"); done < .oauth
	IAP_CLIENT_ID=${lines[0]}
	IAP_CLIENT_SECRET=${lines[1]}
	TOKEN=$(gcloud auth print-access-token)
	echo -e "${COLOR}Enabling IAP for App Engine...${NC}"
	curl -X PATCH -H "Content-Type: application/json" \
		-H "Authorization: Bearer $TOKEN" \
		--data "{\"iap\": {\"enabled\": true, \"oauth2ClientId\": \"$IAP_CLIENT_ID\", \"oauth2ClientSecret\": \"$IAP_CLIENT_SECRET\"} }" \
		"https://appengine.googleapis.com/v1/apps/$PROJECT_ID?alt=json&update_mask=iap"
	echo -e "${COLOR}Granting user $USER_EMAIL access to the app through IAP...${NC}"
	gcloud iap web add-iam-policy-binding --resource-type=app-engine --member="user:$USER_EMAIL" --role='roles/iap.httpsResourceAccessor'
}

deploy_files () {
  echo 'Deploying files to GCS'
  if ! gsutil ls gs://$PROJECT_ID > /dev/null 2> /dev/null; then
    gsutil mb -b on gs://$PROJECT_ID
  fi


  gsutil -m rm -r $GCS_BASE_PATH/
  if [[ -f ./google-ads.yaml ]]; then
    gsutil -h "Content-Type:text/plain" cp ./google-ads.yaml $GCS_BASE_PATH/google-ads.yaml
  elif [[ -f $HOME/google-ads.yaml ]]; then
    gsutil -h "Content-Type:text/plain" cp $HOME/google-ads.yaml $GCS_BASE_PATH/google-ads.yaml
  else
    echo "Please upload google-ads.yaml"
  fi
}

print_welcome_message() {
	echo -e "\n${COLOR}Done! Please verify the install at https://$PROJECT_ID.ew.r.appspot.com${NC}"

}

generate_youtube_api_key() {
	gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:$USER_EMAIL" --role roles/serviceusage.apiKeysAdmin
	curl -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" \
		https://apikeys.googleapis.com/v2/projects/$PROJECT_NUMBER/locations/global/keys -X POST -d '{"displayName" : "CPR YouTube Data API Key", "restrictions": {"api_targets": [{"service": "youtube.googleapis.com"}]}}'
	key_name=`curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" https://apikeys.googleapis.com/v2/projects/$PROJECT_NUMBER/locations/global/keys | grep -B1 "CPR YouTube Data API Key" | head -n 1 | cut -d '"' -f4`
	youtube_api_key=`curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" https://apikeys.googleapis.com/v2/$key_name/keyString | grep keyString | cut -d '"' -f4`

}

deploy_all() {
	check_billing_enabled
	check_ads_config
	enable_api
	generate_youtube_api_key
	deploy_files
	build_frontend
	deploy_app
	create_topics
	deploy_cloud_functions
	create_datastore
	create_oauth_for_iap
	update_permissions
	print_welcome_message
}


_list_functions() {
	# list all functions in this file not starting with "_"
	declare -F | awk '{print $3}' | grep -v "^_"
}


if [[ $# -eq 0 ]]; then
	_list_functions
else
	for i in "$@"; do
		if declare -F "$i" > /dev/null; then
			"$i"
			exitcode=$?
			if [ $exitcode -ne 0 ]; then
				echo "Breaking script as command '$i' failed"
				exit $exitcode
			fi
		else
			echo -e "\033[0;31mFunction '$i' does not exist.\033[0m"
		fi
	done
fi
