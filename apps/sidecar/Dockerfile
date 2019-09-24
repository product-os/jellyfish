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

RUN apt-get update && apt-get install -y \
	libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 \
	libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	gconf-gsettings-backend libasound2 libatk1.0-0 libgtk-3-0

# Sleep forever
# See: https://stackoverflow.com/a/35770783
CMD exec /bin/bash -c "trap : TERM INT; sleep infinity & wait"
