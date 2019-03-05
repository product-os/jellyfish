#!/bin/sh

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
COMMAND="$1"
SUBCOMMAND="$2"
set -u

K8S_NAMESPACE="jellyfish"

check() {
	if [ -z "$1" ]; then
		echo "$2" 1>&2
		exit 1
	fi
}

get_container() (
	pod_names="$(kubectl get pods -n jellyfish -o custom-columns=:metadata.name)"
	echo "$pod_names" | grep "^$1" || true
)

usage() {
	echo "Usage: $0 <command>" 1>&2
	echo "" 1>&2
	echo "This is command line tool to interact with the production" 1>&2
	echo "Kubernetes environment. Before you can use this tool, ensure" 1>&2
	echo "the DevOps team gives you access and the right configuration" 1>&2
	echo "file to place at ~/.kube/config." 1>&2
	echo "" 1>&2
	echo "Also make sure you add the following entry to /etc/hosts:" 1>&2
	echo "" 1>&2
	echo "    127.0.0.1 api.uswest2.k8s.resinstaging.io" 1>&2
	echo "" 1>&2
	echo "Commands:" 1>&2
	echo "" 1>&2
	echo "    status              Print information about the environment" 1>&2
	echo "    restart <container> Restart a container" 1>&2
	echo "    logs <container>    Stream the logs from a container" 1>&2
	echo "    shell <container>   Open a shell on a container" 1>&2
	echo "" 1>&2
	echo "Examples:" 1>&2
	echo "" 1>&2
	echo "    $0 status" 1>&2
	echo "    $0 logs jellyfish" 1>&2
	echo "    $0 shell jellyfish" 1>&2
	exit 1
}

if ! [ -x "$(command -v kubectl)" ]; then
  echo "You need to install kubectl" >&2
  exit 1
fi

if [ -z "$COMMAND" ]; then
	usage
fi

# Kill all children on exit
# See https://stackoverflow.com/a/5586663/1641422
trap 'kill $(jobs -pr)' INT TERM EXIT

# Open the SSH tunnel in the background, and wait
# for a while to make sure its available
ssh -N -L 8443:api.uswest2.k8s.resinstaging.io:443 admin@bastion.uswest2.k8s.resinstaging.io &
sleep 3

if [ "$COMMAND" = "status" ]; then
	kubectl get pods --namespace "$K8S_NAMESPACE"
	exit 0
fi

if [ "$COMMAND" = "restart" ]; then
	check "$SUBCOMMAND" "You must specify a container as an argument"
	CONTAINER="$(get_container "$SUBCOMMAND")"
	check "$CONTAINER" "Invalid container: $SUBCOMMAND"
	echo "Restarting $CONTAINER..."
	kubectl delete pod "$CONTAINER" --namespace "$K8S_NAMESPACE"
	exit 0
fi

if [ "$COMMAND" = "logs" ]; then
	check "$SUBCOMMAND" "You must specify a container as an argument"
	CONTAINER="$(get_container "$SUBCOMMAND")"
	check "$CONTAINER" "Invalid container: $SUBCOMMAND"
	echo "Getting logs from $CONTAINER..."
	kubectl logs --follow "$CONTAINER" --namespace "$K8S_NAMESPACE"
	exit 0
fi

if [ "$COMMAND" = "shell" ]; then
	check "$SUBCOMMAND" "You must specify a container as an argument"
	CONTAINER="$(get_container "$SUBCOMMAND")"
	check "$CONTAINER" "Invalid container: $SUBCOMMAND"
	echo "Starting shell at $CONTAINER..."
	kubectl exec --stdin --tty "$CONTAINER" bash --namespace "$K8S_NAMESPACE"
	exit 0
fi

usage
