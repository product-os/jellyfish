#!/bin/bash

if [ "$#" -ne 1 ] ;then
	echo "keyframe path required as first argument."
	exit 1
fi

# patch /etc/hosts for tunneling k8s api
echo "127.0.0.1 $K8S_STG_API" >> /etc/hosts
echo "hosts: files dns" > /etc/nsswitch.conf

# Install kubectl
wget -O kubectl "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x ./kubectl && mv kubectl /usr/local/bin/

# Generate environments.yml
cp ./environments.tpl.yml ./environments.yml
sed -i "s/K8S_STG_BASTION_USERNAME/$K8S_STG_BASTION_USERNAME/g" ./environments.yml
sed -i "s/K8S_STG_BASTION/$K8S_STG_BASTION/g" ./environments.yml
sed -i "s/K8S_STG_API/$K8S_STG_API/g" ./environments.yml

# Get environments.yml required files (kubeconfig, jellyfish_key)
echo "$JELLYFISH_STG_KUBECONFIG" | base64 -d > ./kubeconfig
echo "$K8S_STG_BASTION_KEY" | base64 -d > jellyfish_pk
chmod 400 jellyfish_pk

# Deploy with katapult
katapult deploy -t kubernetes -e staging -c . -v -k "$1"

