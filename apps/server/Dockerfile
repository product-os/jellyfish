FROM scratch AS preface

COPY apps/server apps/server

FROM jellyfish-server-base

COPY --from=preface . .

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
