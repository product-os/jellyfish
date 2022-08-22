FROM balena/open-balena-base:v13.3.1

USER root
RUN apt update && apt install -y postgresql-client && rm -rf /var/lib/apt/lists/*
RUN curl https://raw.githubusercontent.com/ory/meta/master/install.sh -o install.sh \
	&& chmod +x install.sh \
	&& bash ./install.sh -d -b . hydra v1.11.8 \
	&& mv hydra /usr/local/bin/hydra

COPY ./start.sh /root/start.sh
RUN chmod +x /root/start.sh
COPY ./config.yml /etc/config/hydra/hydra.yml

CMD [ "/root/start.sh" ]
