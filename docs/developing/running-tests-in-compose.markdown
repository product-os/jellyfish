# Running tests in compose

This document outlines how developers can run CI tests/tasks in a local `docker-compose` cluster.
This method closely emulates how tests/tasks are executed in balenaCI and may help tests that may be passing "natively", but are failing/flaky in balenaCI.

Next, run a couple `make` commands to build images and start the cluster:
```sh
$ SUT=1 make compose-build
$ SUT=1 make compose-up
```

All tests and tasks executed in CI are defined in `Taskfile.yml` and are executed with [task](https://github.com/go-task/task).
We can execute the same exact tasks executed in balenaCI in a local compose cluster as shown in the examples below.

Once the cluster is up and running, the `sut` container that runs all of our CI tests/tasks in balenaCI should be up and running, but asleep.
We need to find the name of this container so we can execute these tests/tasks.
```sh
$ docker ps -a
```

Once we have the name, we can execute tasks from our local machine:
```sh
# Run the "unit" task
$ docker exec <sut-container-name> task unit

# Run the "lint" task
$ docker exec <sut-container-name> task lint

# Run the "e2e-ui" task
$ docker exec <sut-container-name> task e2e-ui
```

Or, we can jump into the container and execute tasks directly.
One benefit of this method is that once we are in the container, we can edit test files within it using `vim`/`nano` to more easily add debug logs, etc.
```sh
$ docker exec -ti <sut-container-name> bash

# Run the "unit" task
$ task unit

# Run the "lint" task
$ task lint

# Run the "e2e-ui" task
$ task e2e-ui
```
