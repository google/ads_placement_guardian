# Ads Placement Guardian

## Problem statement

There are a number of “spam/bot” and poor performing channels on YouTube, causing customers to spends large amounts of money on YouTube video campaigns on channels that do not drive results.

Clients need a solution that can quickly and automatically keep on top of poor performing channels or potential “spam/bot” channels and exclude them from their entire account on a regular basis.

## Solution

A Google Cloud based solution for excluding YouTube channels at an account level, based on a set of criteria defined by the client. A client can select a set of filters within their Google Ads data (such as low conversions, high CPMs or no traffic etc.) and then apply a set of YouTube filters against channel statistic (such as subscriber count, video views, language etc.) and exclude specific channels that do not meet the performance requirements.

The tool will display all the merged data, exclusions available and can be scheduled to automatically run the process on a regular basis to keep up with any new channels or campaigns that fall outside of the required performance.


## Deliverable (implementation)

Web application that can be used for performing ad-hoc placement exclusions as well as scheduling tasks.

## Deployment

### Prerequisites

1. [A Google Ads Developer token](https://developers.google.com/google-ads/api/docs/first-call/dev-token#:~:text=A%20developer%20token%20from%20Google,SETTINGS%20%3E%20SETUP%20%3E%20API%20Center.)

1. A GCP project with billing account attached
1. Credentials for Google Ads API access - `google-ads.yaml`.
   See details here - https://github.com/google/ads-api-report-fetcher/blob/main/docs/how-to-authenticate-ads-api.md \
   Normally you need OAuth2 credentials (Client ID, Client Secret), a Google Ads developer token and a refresh token.

### Installation

The primary installation method deploys APG into Google Cloud.
The procedure automates deploying all required components to the Cloud.

> For local deployment please refer to [local deployment guide](docs/run-cpr-locally.md).
1. First you need to clone the repo in Cloud Shell:

```
git clone https://github.com/google/ads_placement_guardian.git
```

1. Go to the repo folder: `cd ads_placement_guardian/`

1. Optionally put your `google-ads.yaml` there or be ready to provide all Ads API credentials

1. Optionally adjust settings in `gcp/settings.ini`

1. Run installation:

```
./gcp/install.sh deploy_all
```

> You can update the existing installation by running `./gcp/update.sh`

### Usage

After Google cloud installation is completed, you'll be presented with a URL when Ads Placement Guardian is running.

Alternatively you can open `default` services in [Appengine Services](https://corp.google.com/appengine/services) to access the application.
> If you changed `service` name in look for this service name in Appengine.

## Disclaimer
This is not an officially supported Google product.
