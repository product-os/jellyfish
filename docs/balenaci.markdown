Using Balena CI
===============

We use [Balena
CI](https://ci.balena-dev.com/teams/main/pipelines/github-events-resin) to run
various PR checks, build the Docker containers, and deploy them to production.

Balena CI reports various status checks to GitHub, linking you to the
corresponding logs:

![Balena CI status checks](./assets/balenaci-status-checks.png)

The Balena CI pipeline overview looks like this:

![Balena CI pipeline overview](./assets/balenaci-pipeline-overview.png)

Jellyfish is (in Balena CI parlance) a "Docker" project, so its PR builds will
appear on the `docker` job rectangle that the screenshot displays at the top
right of the pipeline, along side with any other Docker build that Balena CI
deals with.

When you merge a PR, Balena CI will trigger a `master` build to deploy the
application which you will be able to track on the `publish` job rectangle. If
you open it, you will be able to find some builds that refer to `jellyfish` in
the metadata that appears at the right hand side of the screen, such as this
one:

![Balena CI publish job](./assets/balenaci-publish-job.png)

If you scroll down a bit, you will see all the sub tasks concerned with
publishing the containers to DockerHub, automatically updating the version,
deploying with Katapult, etc.

This is the job that eventually pushes the version commit:

![Balena CI version bump](./assets/balenaci-version-bump.png)

You rarely need to take a look at the publish job logs, but its handy in case
things go wrong. Most of the times, you will merge a PR, see the version bump
commit in a few minutes, and see the new version getting deployed some minutes
afterwards.
