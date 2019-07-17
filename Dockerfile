###########################################################
# Runtime
###########################################################

FROM resinci/jellyfish-base:c9d3a76a

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/
RUN NODE_ENV=production npm ci
COPY . /usr/src/app

CMD [ "make", "start-server", "OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish" ]
