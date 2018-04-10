#!/usr/bin/env bash
npm install && cd lib/sync && tsc && node ./dist/flowdock.js $1
