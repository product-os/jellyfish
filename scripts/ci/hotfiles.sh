#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

# Credit to https://stackoverflow.com/a/7686616/1641422
# Notice we want to focus on lib/ production code

hotfiles() (
	sort | grep "^lib"
)

hotmodules() (
	hotfiles | cut -d/ -f-2
)

summary() (
	uniq -c \
		| sort --reverse --sort=general-numeric \
		| tail -n +2 \
		| head -5
)

git log --pretty=format: --name-only --since "1 month ago" | hotfiles | summary > HOTFILES_MONTH
git log --pretty=format: --name-only --since "1 week ago" | hotfiles | summary > HOTFILES_WEEK
git log --pretty=format: --name-only --since "1 month ago" | hotmodules | summary > HOTMODULES_MONTH
git log --pretty=format: --name-only --since "1 week ago" | hotmodules | summary > HOTMODULES_WEEK

echo "#### Most Updated Files"
echo ""
echo "Last Month | Last Week"
echo "-----------|----------"
paste -d\| HOTFILES_MONTH HOTFILES_WEEK | sed "s/^[ \t]*//"
echo ""
echo "#### Most Updated Modules"
echo ""
echo "Last Month | Last Week"
echo "-----------|----------"
paste -d\| HOTMODULES_MONTH HOTMODULES_WEEK | sed "s/^[ \t]*//"

rm HOTFILES_MONTH HOTFILES_WEEK HOTMODULES_MONTH HOTMODULES_WEEK
