FROM node:dubnium-jessie as base

RUN apt-get update && apt-get install make

WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY package-lock.json /usr/src/app
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json /usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci

COPY . /usr/src/app
RUN make build

FROM node:dubnium-jessie as test

# Install rethinkdb for tests
RUN echo "deb http://download.rethinkdb.com/apt jessie main" | tee /etc/apt/sources.list.d/rethinkdb.list && \
		wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | apt-key add - && \
		apt-get update && \
		apt-get install -yq rethinkdb make shellcheck

# See https://crbug.com/795759
RUN apt-get update && apt-get install -yq libgconf-2-4

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update && apt-get install -y wget --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst ttf-freefont \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app

RUN rethinkdb --version && \
		rethinkdb --daemon --bind all && \
		make lint && \
		make test-unit COVERAGE=0

FROM node:dubnium-jessie as runtime

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app

CMD [ "make", "start-server" ]
