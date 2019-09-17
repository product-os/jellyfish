###########################################################
# Runtime
###########################################################

FROM resinci/jellyfish-base:ffea33d27

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json \
	/usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app

# Sleep forever
# See: https://stackoverflow.com/a/35770783
CMD exec /bin/bash -c "trap : TERM INT; sleep infinity & wait"
