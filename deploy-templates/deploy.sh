#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -xe

exit 0

# install kubectl
kubectl_release=v1.18.2 \
  && wget -qO kubectl "https://storage.googleapis.com/kubernetes-release/release/${kubectl_release}/bin/linux/amd64/kubectl" \
  && [[ "6ea8261b503c6c63d616878837dc70b758d4a3aeb9996ade8e83b51aedac9698" == "$(sha256sum kubectl | awk '{print $1}')" ]] \
  && chmod +x ./kubectl \
  && mv kubectl /usr/local/bin/

# install unzip
command -v unzip || (apt-get update && apt-get install -y unzip)

# install aws-cli
command -v aws || (wget -qO awscliv2.zip https://awscli.amazonaws.com/awscli-exe-linux-x86_64-2.0.9.zip \
  && [[ "90b250a0995ec177f63b76a4808f908c9b80e8584e3f625ef468b8e52621b23f" == "$(sha256sum awscliv2.zip | awk '{print $1}')" ]] \
  && unzip -q awscliv2.zip \
  && ./aws/install \
  && aws --version)

# install aws-iam-authenticator
command -v aws-iam-authenticator || (wget -qO aws-iam-authenticator https://amazon-eks.s3.us-west-2.amazonaws.com/1.15.10/2020-02-22/bin/linux/amd64/aws-iam-authenticator \
  && [[ "fe958eff955bea1499015b45dc53392a33f737630efd841cd574559cc0f41800" == "$(sha256sum aws-iam-authenticator | awk '{print $1}')" ]] \
  && chmod +x ./aws-iam-authenticator \
  && mv aws-iam-authenticator /usr/local/bin/)

# setup up AWS access and update kube/config
# requires `arn:aws:iam::{{aws_account_id}}:user/katapult` to be granted appropriate access to the cluster
# (i.e.) `kubectl edit configmap -n kube-system aws-auth`
# see, [documentation](https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html)
mkdir -p ~/.aws \
  && echo "${AWS_CREDENTIALS_FILE}" | base64 -d > ~/.aws/credentials \
  && aws sts get-caller-identity \
  && aws eks update-kubeconfig --name "${EKS_CLUSTER_NAME}" --region "${AWS_REGION}" --profile "${AWS_PROFILE}" \
  && kubectl config view \
  && kubectl get svc

KATAPULT_KUBE_CONFIG="$(cat ~/.kube/config)"
export KATAPULT_KUBE_CONFIG

# deploy with katapult
katapult deploy -t kubernetes \
  -e jellyfish-product \
  -k jellyfish-product/product/"${1}"
