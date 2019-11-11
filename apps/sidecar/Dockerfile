###########################################################
# Runtime
###########################################################

FROM resinci/jellyfish-base:a966886d

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json \
	/usr/src/jellyfish/scripts/eslint-plugin-jellyfish
RUN mkdir -p scripts/template
COPY scripts/template/package*.json \
	/usr/src/jellyfish/scripts/template/
RUN npm ci

RUN apt-get update && apt-get install -y \
	libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 \
	libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	gconf-gsettings-backend libasound2 libatk1.0-0 libgtk-3-0

COPY . /usr/src/jellyfish

# Sleep forever
# See: https://stackoverflow.com/a/35770783
CMD exec /bin/bash -c "trap : TERM INT; sleep infinity & wait"
