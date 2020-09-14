FROM resinci/jellyfish-test:v1.3.17

WORKDIR /usr/src/jellyfish

COPY scripts/ /usr/src/jellyfish/scripts/
COPY apps/sidecar/package.json apps/sidecar/package-lock.json /usr/src/jellyfish/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc && \
    npm i && rm -f ~/.npmrc && mkdir .git

#dev-cmd-live=trap : TERM INT; sleep infinity & wait

COPY deploy-templates/ /usr/src/jellyfish/deploy-templates/
COPY .eslintrc.yml /usr/src/jellyfish/
COPY apps/ /usr/src/jellyfish/apps/
COPY test/ /usr/src/jellyfish/test/
COPY Makefile /usr/src/jellyfish/
COPY ./.git* ./.git/
COPY *.env /usr/src/jellyfish/

CMD exec /bin/bash -c "trap : TERM INT; sleep infinity & wait"
