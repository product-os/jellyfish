#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const redText = '\x1b[31m'
const semver = require('semver')
const {
	engines
} = require('../package')
const version = engines.node
if (!semver.satisfies(process.version, version)) {
	console.error(redText, `ERROR: The current node version ${process.version} does not satisfy the required version ${version}.`)
	process.exit(1)
}
