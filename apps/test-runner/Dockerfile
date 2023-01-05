FROM balena/open-balena-base:v14.1.4 AS base

WORKDIR /usr/src/jellyfish
ENV DEBIAN_FRONTEND noninteractive

# Download go-task (taskfile)
RUN sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Add repository for postgresql client
RUN apt-get update && \
	apt-get install -y lsb-release && \
	echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list; \
	apt-get purge lsb-release
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Install chromium dependencies and postgresql-client
RUN apt-get update && \
	apt-get install -y --no-install-recommends libx11-xcb1 libxcomposite1 libxcursor1 \
		libxdamage1 libxi6 libxtst6 libnss3 libnss3-tools libcups2 libxss1 libxrandr2 \
		gconf-gsettings-backend libasound2 libatk1.0-0 libgtk-3-0 \
		libxshmfence1 libxcb-dri3-0 libdrm-dev libgbm-dev \
		postgresql-client-14 && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
COPY ./apps/server ./apps/server
COPY ./test ./test
COPY ./scripts ./scripts
COPY ./tslint.json ./tslint.json
COPY ./Taskfile.yml ./Taskfile.yml
COPY ./playwright.config.js ./playwright.config.js
COPY ./functions ./functions
COPY ./.git .
COPY ./apps/test-runner/start-jellyfish-test-runner.sh ./apps/test-runner/start-jellyfish-test-runner.sh
# --- run unit tests
FROM base AS test

ARG CI=1
ARG SUT=1

WORKDIR /usr/src/jellyfish

# --- Local Mode livepush
#dev-copy=. ./
#dev-run=systemctl enable confd
#dev-cmd-live=/usr/bin/entry.sh
# --- stops here

SHELL [ "/bin/bash", "-c" ]

RUN [[ $SUT -eq 1 ]] && npm ci && task lint


# --- tests runtime
FROM base

ENV CI 1

WORKDIR /usr/src/jellyfish

RUN systemctl enable confd
