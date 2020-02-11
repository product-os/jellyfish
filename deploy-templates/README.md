# jellyfish-secrets
> Jellyfsh [secrets](https://kubernetes.io/docs/concepts/configuration/secret/) require to be created manually in the Kubernetes secrets store for their values to become available to the application as environment variables

## configure kubectl
> See [Gaining access to the Jellyfish Kubernetes Bastion Host](https://balena-io.github.io/devops-playbook/#4a0e182a-f00e-4b5c-9733-c5d727b76884) and [Managing Jellyfish](https://balena-io.github.io/devops-playbook/#6ec03f40-b371-11e9-a442-3d1a0ba3344d)


## create secret
> (e.g.) to create `RABBITMQ_HOSTNAME` opaque secret in the k8s cluster, run

    kubectl -n jellyfish create secret generic rabbitmq-hostname \
      --from-literal=RABBITMQ_HOSTNAME=rabbitmq


## view secret

    kubectl -n jellyfish describe secret rabbitmq-hostname

    kubectl -n jellyfish get secret rabbitmq-hostname

    kubectl -n jellyfish get secret rabbitmq-hostname -o yaml
