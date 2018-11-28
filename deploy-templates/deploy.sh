#!/bin/bash

if [ "$#" -ne 1 ] ;then
	echo "keyframe path required as first argument." 
	exit 1
fi

# Get kubectl for the deploy part
wget -O kubectl https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl && chmod +x ./kubectl
# Get current katapult binary
wget -O katapult https://misc1.dev.resin.io/~mikesimos/katapult && chmod +x ./katapult

# Generate environments.yml
cp ./environments.tpl.yml ./environments.yml
sed -i "s/K8S_STG_BASTION_USERNAME/$K8S_STG_BASTION_USERNAME/g" ./environments.yml
sed -i "s/K8S_STG_BASTION/$K8S_STG_BASTION/g" ./environments.yml
sed -i "s/K8S_STG_API/$K8S_STG_API/g" ./environments.yml

# Get environments.yml required files (kubeconfig, jellyfish_key)
echo $JELLYFISH_STG_KUBECONFIG|base64 -d > ./kubeconfig
echo $K8S_STG_BASTION_KEY|base64 -d > jellyfish_pk

# Deploy with katapult
./katapult deploy -t kubernetes -e staging -c . -v -k $1
