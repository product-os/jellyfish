#!/bin/bash

WORKDIR="/usr/src/jellyfish"
LOCAL_POSTGRES_HOST="localhost"
LOCAL_POSTGRES_USER="postgres"
LOCAL_POSTGRES_PASSWORD=$LOCAL_POSTGRES_USER
LOCAL_POSTGRES_DATABASE="jellyfish"
JF_TABLES=("cards" "links" "requests")

function start_postgres() {
	service postgresql start
	su - postgres -c \
		"psql -U$LOCAL_POSTGRES_USER -d$LOCAL_POSTGRES_DATABASE -c \"alter user $LOCAL_POSTGRES_USER with password '$LOCAL_POSTGRES_PASSWORD';\""
	su - postgres -c \
		"psql -U$LOCAL_POSTGRES_USER -dpostgres -c \"alter user $LOCAL_POSTGRES_USER with password '$LOCAL_POSTGRES_PASSWORD';\""
}

function start_redis() {
	service redis-server start
}

function start_backend() {
	cd $WORKDIR
	POSTGRES_HOST=$LOCAL_POSTGRES_HOST POSTGRES_USER=$LOCAL_POSTGRES_USER POSTGRES_PASSWORD=$LOCAL_POSTGRES_PASSWORD \
		LOCAL_POSTGRES_DATABASE=$LOCAL_POSTGRES_DATABASE make start-tick > /root/tick.log 2>&1 &
}

function start_queue() {
	cd $WORKDIR
	while true
	do
		tick_pids=$(pgrep -f "make start-tick")
		echo "tick_pids:$tick_pids"
		if [ "$tick_pids" == "" ]; then
			echo "starting tick..."
			POSTGRES_HOST=$LOCAL_POSTGRES_HOST POSTGRES_USER=$LOCAL_POSTGRES_USER POSTGRES_PASSWORD=$LOCAL_POSTGRES_PASSWORD \
				LOCAL_POSTGRES_DATABASE=$LOCAL_POSTGRES_DATABASE make start-tick > /root/tick.log 2>&1 &
		fi

		worker_pids=$(pgrep -f "make start-worker")
		echo "worker_pids:$worker_pids"
		if [ "$worker_pids" == "" ]; then
			echo "starting worker..."
			POSTGRES_HOST=$LOCAL_POSTGRES_HOST POSTGRES_USER=$LOCAL_POSTGRES_USER POSTGRES_PASSWORD=$LOCAL_POSTGRES_PASSWORD \
				LOCAL_POSTGRES_DATABASE=$LOCAL_POSTGRES_DATABASE make start-worker > /root/worker.log 2>&1 &
		fi

		sleep 5
	done
}

function start_ui() {
	cd $WORKDIR
	NODE_ENV=test UI_DIRECTORY="$WORKDIR/apps/ui" API_URL=http://localhost:8000 \
		./node_modules/.bin/webpack-dev-server --config=./apps/ui/webpack.config.js > /root/ui.log 2>&1 &
}

function start_livechat() {
	cd $WORKDIR
	NODE_ENV=test UI_DIRECTORY="$WORKDIR/apps/livechat" API_URL=http://localhost:8000 \
		./node_modules/.bin/webpack-dev-server --config=./apps/livechat/webpack.config.js > /root/livechat.log 2>&1 &
}

function stop_postgres() {
	drop_tables && service postgresql stop
}

function drop_tables() {
	for TABLE in "${JF_TABLES[@]}"
	do
		su - postgres -c "psql -U$LOCAL_POSTGRES_USER -d$LOCAL_POSTGRES_DATABASE -c \"drop table if exists $TABLE cascade;\""
	done
}

function stop_redis() {
	service redis-server stop
	pkill redis-server
}

function stop_node() {
	pkill node
}
