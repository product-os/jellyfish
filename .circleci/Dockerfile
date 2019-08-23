FROM resinci/jellyfish-base:f36ab6b14 as base

# Install node, git and packages required to run headless chrome
RUN apt-get update && apt-get install -y gnuplot \
	python-pip libx11-xcb1 libxcomposite1 \
	libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	libasound2 libatk1.0-0 libgtk-3-0 shellcheck \
	redis-server postgresql

RUN git clone git://github.com/hoxu/gitstats.git && \
	cd gitstats && make install

# So we can use rabbitmqadmin
RUN rabbitmq-plugins enable rabbitmq_management

RUN npm install -g redoc-cli

# Redis will try to set ulimit at startup, and that won't work
# in non-privileged containers
RUN sed -i 's/[ \t]*ulimit.*/:/g' /etc/init.d/redis-server
