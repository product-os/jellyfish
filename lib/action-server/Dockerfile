FROM resinci/jellyfish-test as base

WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY package-lock.json /usr/src/app
RUN npm ci
COPY . /usr/src/app

CMD [ "make", "start-worker" ]
