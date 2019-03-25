FROM balena/open-balena-base:v5.3.1 as base

# Install node, git and packages required to run headless chrome
RUN apt-get update && apt-get install -y gnuplot gitstats \
	python-pip libx11-xcb1 libxcomposite1 \
	libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	libgconf2-4 libasound2 libatk1.0-0 libgtk-3-0 shellcheck redis-server postgresql

RUN npm install -g redoc-cli
