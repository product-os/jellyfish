/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const mkdirp = require('mkdirp')
const uuid = require('uuid/v4')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIRECTORY = path.resolve(process.cwd(), '.nyc_output')
const RUNTIME_COVERAGE_KEY = '__coverage__'
const REPORT_PATH = path.resolve(OUTPUT_DIRECTORY, `${uuid()}.json`)

process.on('exit', () => {
	if (global[RUNTIME_COVERAGE_KEY]) {
		const report = JSON.stringify(global[RUNTIME_COVERAGE_KEY], null, 2)
		console.log(`Writing coverage report to ${REPORT_PATH}`)
		mkdirp.sync(OUTPUT_DIRECTORY)
		fs.writeFileSync(REPORT_PATH, report, 'utf8')
	}
})

process.on('SIGINT', () => {
	process.exit(130)
})
