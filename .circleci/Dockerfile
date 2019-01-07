FROM rethinkdb:2.3.6

RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
# Install node, git and packages required to run headless chrome
RUN apt-get update && apt-get install -y nodejs gnuplot gitstats build-essential \
	wget jq git python-pip python-dev libX11-xcb1 libxcomposite1 \
	libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	libgconf2-4 libasound2 libatk1.0-0 libgtk-3-0 shellcheck
RUN pip install rethinkdb
RUN npm install -g npm
RUN npm install -g redoc-cli
