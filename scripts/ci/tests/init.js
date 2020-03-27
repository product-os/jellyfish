#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const childProcess = require('child_process')
const fs = require('fs')

/*
 * This script runs test scripts as background jobs, monitoring output and
 * restarting/killing non-responsive jobs as necessary.
 */

const TIMEOUT = 120 * 1000
const RETRIES = 3
const SCRIPTS_DIR = '/usr/src/jellyfish/scripts'
const TESTS_DIR = `${SCRIPTS_DIR}/ci/tests`

const jobs = {}

// Install dependencies.
const installDeps = () => {
	childProcess.execSync(`cd ${SCRIPTS_DIR}/template && npm install`)
}

// Loop through script files and start them as jobs.
const startJobs = () => {
	fs.readdirSync(TESTS_DIR).forEach((file) => {
		if (file.match(/\.spec\.sh$/)) {
			jobs[file] = {
				output: 0,
				retries: RETRIES
			}
			startJob(file)
		}
	})
}

// Start a single test.
const startJob = (file) => {
	jobs[file].process = childProcess.execFile(`${TESTS_DIR}/${file}`)
	jobs[file].process.stdout.on('data', (data) => {
		jobs[file].output += data.length
		const line = data.replace(/\n/gm, '')
		console.log(`[${file}] ${line}`)
	})
	jobs[file].process.on('exit', (code) => {
		// Exit with non-zero code if any job fails.
		if (_.isInteger(code) && code !== 0) {
			console.log(`Job exited with code ${code}`)
			process.exit(1)
		}

		// Remove job from list and exit with 0 if all jobs are done.
		Reflect.deleteProperty(jobs, file)
		if (Object.keys(jobs).length === 0) {
			process.exit(0)
		}
	})
}

// Watch test output and restart/kill if necessary.
// Uses length of jobs output to determine if there has been any test activity.
// If length doesn't change within <TIMEOUT> seconds, job is considered inactive.
const watchJobs = () => {
	const prev = {}
	setInterval(() => {
		_.forOwn(jobs, (value, key) => {
			if (prev[key] && prev[key] === jobs[key].output) {
				if (jobs[key].retries > 0) {
					restartJob(key)
				} else {
					console.error(`[ERROR] Bailing out, [${key}] has no retries left`)
					process.exit(1)
				}
			}

			// Update previous output length data for next check.
			prev[key] = jobs[key].output
		})
	}, TIMEOUT)
}

// Restart a single test.
const restartJob = (file) => {
	console.log(`[${file}] No new output from job, restarting...`)
	jobs[file].retries -= 1
	jobs[file].output = 0
	jobs[file].process.kill(0)
	Reflect.deleteProperty(jobs[file], 'process')
	startJob(file)
}

installDeps()
startJobs()
watchJobs()
