###########################################################
# Runtime
###########################################################

#FROM balena/open-balena-base:v9.0.4
FROM resinci/jellyfish-test:latest

WORKDIR /usr/src/jellyfish

COPY webpack.config.base.js /usr/src/jellyfish/
COPY ./scripts ./scripts
COPY package.json package-lock.json /usr/src/jellyfish/
# RUN mkdir -p scripts/eslint-plugin-jellyfish
# COPY scripts/eslint-plugin-jellyfish/package.json \
# 	/usr/src/jellyfish/scripts/eslint-plugin-jellyfish
# RUN mkdir -p scripts/template
# COPY scripts/template/package*.json \
# 	/usr/src/jellyfish/scripts/template/
RUN npm ci

RUN apt-get update && apt-get install -y \
	libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 \
	libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	gconf-gsettings-backend libasound2 libatk1.0-0 libgtk-3-0 \
	postgresql-client-11

COPY ./apps ./apps
COPY ./lib ./lib
COPY ./test ./test
COPY ./Makefile ./Makefile

# Sleep forever
# See: https://stackoverflow.com/a/35770783
#CMD exec /bin/bash -c "trap : TERM INT; sleep infinity & wait"
#ENTRYPOINT ["/usr/src/jellyfish/ci/sidecar/entrypoint.sh"]
CMD /bin/bash -c "/usr/src/jellyfish/scripts/ci/tests/$TEST_NAME.sh"
