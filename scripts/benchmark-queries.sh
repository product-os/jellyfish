#!/bin/sh

set -eux

make node FILE=./scripts/benchmark-queries.js DATABASE=postgres LOGLEVEL=info
