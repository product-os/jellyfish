FROM resinci/jellyfish-base:ffea33d27 as base

RUN git clone git://github.com/hoxu/gitstats.git && cd gitstats && make install

RUN apt-get update && apt-get install -y \
	apt-transport-https ca-certificates curl gnupg2 software-properties-common

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
	add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" && \
	apt-get update && \
	apt-get install -y docker-ce docker-ce-cli containerd.io

RUN curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" \
	-o /usr/local/bin/docker-compose && \
	chmod +x /usr/local/bin/docker-compose

RUN apt-get update && apt-get install -y gnuplot \
	python-pip libx11-xcb1 libxcomposite1 \
	libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	gconf-gsettings-backend libasound2 libatk1.0-0 libgtk-3-0 \
	shellcheck redis-server postgresql-11

# Redis will try to set ulimit at startup, and that won't work
# in non-privileged containers
RUN sed -i 's/[ \t]*ulimit.*/:/g' /etc/init.d/redis-server

RUN npm install --unsafe --global balena-cli
