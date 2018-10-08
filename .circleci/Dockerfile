FROM rethinkdb

RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -

# Install node, git and packages required to run headless chrome
RUN apt-get install -y nodejs build-essential git libX11-xcb1 libxcomposite1 \
	libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
	libgconf2-4 libasound2 libatk1.0-0 libgtk-3-0

# Build jsonnet from source (required for linux)
RUN git clone https://github.com/google/jsonnet.git && \
    cd jsonnet && \
    make && \
		cp jsonnet /usr/local/bin


RUN npm install -g npm
