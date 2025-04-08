#!/bin/bash
# wait some time before backend starts
sleep 10
CRON_FILE="/var/spool/cron/root"

if [ ! -f $CRON_FILE ]; then
	touch $CRON_FILE
	/usr/bin/crontab $CRON_FILE
fi
set -f
while true; do
	curl -s -H "Accept: application/json" ${API_HOST:-apg_backend}/api/tasks \
		-o task_list.json
	> crontab.txt
	jq -c '.[]' task_list.json | while read i; do
		task_id=`echo $i | jq -r ".task_id"`
		schedule=`echo $i | jq -r ".schedule"`
		echo "$schedule"
		if [ -z "$schedule" ]; then
			continue
		fi
		if [[ ! "$schedule" =~ "^[0-9]+$" ]]; then
			cron="$schedule"
		else
			hours=`expr $schedule / 24`
		fi
		if [ -z "$cron" ]; then
			if [[ "$hours" -eq 0 ]]; then
				cron="* /$schedule * * *"
			else
				cron="* * /$hours * *"
			fi
		fi
		echo "$cron" "curl -X POST $API_HOST/api/tasks/$task_id:run" >> crontab.txt
	done
	cp -f crontab.txt $CRON_FILE
	sleep 60
done
