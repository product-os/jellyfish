FROM jviottidc/jellyfish-test
RUN apt-get update && apt-get install -y git
COPY . /app
WORKDIR /app
RUN npm install
RUN rethinkdb --daemon --bind all && \
	npm test && \
	node stress/core/insert-serial.js && \
	node stress/core/insert-parallel.js
