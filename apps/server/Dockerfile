###########################################################
# Runtime
###########################################################

FROM resinci/jellyfish-base:ffea33d27

WORKDIR /usr/src/app

ARG ENABLE_COVERAGE=0
ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish
ENV COVERAGE ${ENABLE_COVERAGE}

COPY package.json package-lock.json /usr/src/app/
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json \
	/usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh
CMD [ "sh", "run.sh" ]
