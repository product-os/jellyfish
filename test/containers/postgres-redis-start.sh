#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

service postgresql start && \
	su - postgres -c "psql -U postgres -d postgres -c \"alter user postgres with password 'postgres';\"" && \
	service redis-server start
