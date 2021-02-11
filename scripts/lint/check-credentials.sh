#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

if grep 'NPM_TOKEN\s*=\s*\S' "$@" ; then
	exit 1
fi
