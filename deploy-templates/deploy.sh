#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -xe

# Install kubectl
kubectl_release=v1.18.2 \
  && wget -O kubectl "https://storage.googleapis.com/kubernetes-release/release/${kubectl_release}/bin/linux/amd64/kubectl" \
  && [[ "6ea8261b503c6c63d616878837dc70b758d4a3aeb9996ade8e83b51aedac9698" == "$(sha256sum kubectl | awk '{print $1}')" ]] \
  && chmod +x ./kubectl \
  && mv kubectl /usr/local/bin/ \
  && kubectl version

# install aws-cli
command -v aws || (wget -O awscliv2.zip https://awscli.amazonaws.com/awscli-exe-linux-x86_64-2.0.9.zip \
  && [[ "90b250a0995ec177f63b76a4808f908c9b80e8584e3f625ef468b8e52621b23f" == "$(sha256sum awscliv2.zip | awk '{print $1}')" ]] \
  && unzip awscliv2.zip \
  && ./aws/install \
  && aws --version)

# install aws-iam-authenticator
command -v aws-iam-authenticator || (wget -O aws-iam-authenticator https://amazon-eks.s3.us-west-2.amazonaws.com/1.15.10/2020-02-22/bin/linux/amd64/aws-iam-authenticator \
  && [[ "fe958eff955bea1499015b45dc53392a33f737630efd841cd574559cc0f41800" == "$(sha256sum aws-iam-authenticator | awk '{print $1}')" ]] \
  && chmod +x ./aws-iam-authenticator \
  && mv aws-iam-authenticator /usr/local/bin/)

mkdir -p ~/.aws \
  && echo "${AWS_CREDENTIALS_FILE}" | base64 -d > ~/.aws/credentials \
  && aws sts get-caller-identity \
  && aws eks --region "${AWS_REGION}" update-kubeconfig --name "${EKS_CLUSTER_NAME}" \
  && cat ~/.kube/config \
  && kubectl get svc

# Deploy with katapult
KATAPULT_KUBE_CONFIG="$(cat ~/.kube/config)" \
  katapult deploy -t kubernetes -e jellyfish-product
