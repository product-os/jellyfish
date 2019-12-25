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

RUN apt-get update && apt-get install -y --no-install-recommends \
	libx11-xcb1=2:1.6.7-1 libxcomposite1=1:0.4.4-2 libxcursor1=1:1.1.15-2 \
	libxdamage1=1:1.1.4-3+b3 libxi6=2:1.7.9-1 libxtst6=2:1.2.3-1 libnss3=2:3.42.1-1+deb10u1 \
	libcups2=2.2.10-6+deb10u1 libxss1=1:1.2.3-1 libxrandr2=2:1.5.1-1 \
	gconf-gsettings-backend=3.2.6-5 libasound2=1.1.8-1 libatk1.0-0=2.30.0-2 libgtk-3-0=3.24.5-1 \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/*

COPY . /usr/src/jellyfish

# Sleep forever
# See: https://stackoverflow.com/a/35770783
CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]
