/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const mkdirp = require('mkdirp')
const _ = require('lodash')
const uuid = require('uuid/v4')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIRECTORY = path.resolve(process.cwd(), '.nyc_output')
const RUNTIME_COVERAGE_KEY = '__coverage__'
const REPORT_PATH = path.resolve(OUTPUT_DIRECTORY, `${uuid()}.json`)

const dump = (report) => {
	if (!report || _.isEmpty(report)) {
		return
	}

	console.log(`Writing coverage report to ${REPORT_PATH}`)
	mkdirp.sync(OUTPUT_DIRECTORY)
	fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
}

exports.puppeteer = async (page) => {
	return dump(await page.evaluate((key) => {
		return window[key]
	}, RUNTIME_COVERAGE_KEY))
}

exports.attach = () => {
	process.on('exit', () => {
		dump(global[RUNTIME_COVERAGE_KEY])
	})

	process.on('SIGINT', () => {
		process.exit(130)
	})

	// This is the signal that Docker Compose sends
	// when doing "docker-compose stop"
	process.on('SIGTERM', () => {
		process.exit(0)
	})
}
