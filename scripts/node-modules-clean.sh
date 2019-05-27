#!/bin/sh

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

#################################################
# An effort to reduce random stuff from node_modules
#################################################

set -eux

find node_modules -type f -name ".npmignore" -delete
find node_modules -type f -name ".jscs.json" -delete
find node_modules -type f -name "bower.json" -delete
find node_modules -type f -name ".eslintrc.json" -delete
find node_modules -type f -name ".*" -delete
find node_modules -type d -name ".scripts" -exec rm -rf \;
find node_modules -type d -name ".nyc_output" -exec rm -rf \;
find node_modules -type d -name ".idea" -exec rm -rf \;
find node_modules -type d -name ".changes" -exec rm -rf \;
find node_modules -type f -name "LICENSE" -delete
find node_modules -type f -name "license" -delete
find node_modules -type f -name ".editorconfig" -delete
find node_modules -type f -name "CHANGELOG" -delete
find node_modules -type f -name "Changelog" -delete
find node_modules -type f -name "LICENSE" -delete
find node_modules -type f -name "license" -delete
find node_modules -type f -name ".editorconfig" -delete
find node_modules -type f -name "CHANGELOG" -delete
find node_modules -type f -name "Changelog" -delete
find node_modules -type f -name "ChangeLog" -delete
find node_modules -type f -name "*.map" -delete
find node_modules -type f -name "*.log" -delete
find node_modules -type f -name "*.pak" -delete
find node_modules -type f -name "*.md" -delete
find node_modules -type f -name "*.markdown" -delete
find node_modules -type f -name "*.txt" -delete
find node_modules -type f -name "*.lock" -delete
find node_modules -type f -name "*.flow" -delete
find node_modules -type f -name "*.ts" -delete
find node_modules -type f -name "*.yml" -delete
find node_modules -type f -name "*.less" -delete
find node_modules -type f -name "*.snap" -delete
find node_modules -type f -name "*.gif" -delete
find node_modules -type f -name "*.gz" -delete
find node_modules -type f -name "*.tgz" -delete
find node_modules -type f -name "*.spec.*" -delete
find node_modules -type f -path "*/test/*" -delete
find node_modules -type f -path "*.h" -delete
find node_modules -type f -path "*.o" -delete

du -sh node_modules
