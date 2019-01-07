#!/bin/bash

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

echo "----------------------------------------------"
echo "Most updated files last month"
echo "----------------------------------------------"

git log --pretty=format: --name-only --since "1 month ago" | hotfiles | summary

echo "----------------------------------------------"
echo "Most updated files last week"
echo "----------------------------------------------"

git log --pretty=format: --name-only --since "1 week ago" | hotfiles | summary

echo "----------------------------------------------"
echo "Most updated modules last month"
echo "----------------------------------------------"

git log --pretty=format: --name-only --since "1 month ago" | hotmodules | summary

echo "----------------------------------------------"
echo "Most updated modules last week"
echo "----------------------------------------------"

git log --pretty=format: --name-only --since "1 week ago" | hotmodules | summary
