#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const childProcess = require('child_process')
const fs = require('fs')

/**
 * This script runs test scripts as background jobs, monitoring output and
 * restarting/killing non-responsive jobs as necessary.
 */

const TIMEOUT = 120 * 1000
const RETRIES = 3
const SCRIPTS_DIR = '/usr/src/jellyfish/scripts'
const TESTS_DIR = `${SCRIPTS_DIR}/ci/tests`

/**
 * @summary Install required npm packages
 * @function
 */
const installPackages = () => {
	childProcess.execSync(`cd ${SCRIPTS_DIR}/template && npm install`)
}

/**
 * @summary Start all *.spec.sh scripts as background jobs
 * @function
 *
 * @returns {Object} started jobs
 */
const startJobs = () => {
	const jobs = {}
	fs.readdirSync(TESTS_DIR).forEach((name) => {
		if (name.match(/\.spec\.sh$/)) {
			jobs[name] = {
				complete: false,
				name,
				outputLength: 0,
				retries: RETRIES
			}
			startJob(jobs[name])
		}
	})
	return jobs
}

/**
 * @summary Start a single job
 * @function
 *
 * @param {Object} job - job to start
 * @returns {Object} the job that was started
 */
const startJob = (job) => {
	job.process = childProcess.execFile(`${TESTS_DIR}/${job.name}`, (err, stdout, stderr) => {
		if (err) {
			console.error(`[${job.name}] Job exited with error: ${err}`)
			console.error(`[${job.name}] stderr: ${stderr}`)
			process.exit(1)
		}
		job.complete = true
	})

	// Update jobs output length and make logs easier to parse.
	job.process.stdout.on('data', (data) => {
		job.outputLength += data.length
		const line = data.replace(/\n/gm, '')
		console.log(`[${job.name}] ${line}`)
	})

	return job
}

/**
 * Watch running jobs output and restart/kill if necessary
 * Uses length of jobs output to determine if there has been any test activity
 * If length doesn't change within <TIMEOUT> seconds, job is considered inactive
 *
 * @function
 *
 * @param {Object} jobs - object of running jobs
 */
const watchJobs = (jobs) => {
	const previousOutputLengths = {}
	setInterval(() => {
		// Exit if all jobs are complete
		let incomplete = false
		_.forOwn(jobs, (job) => {
			if (!job.complete) {
				incomplete = true
			}
		})
		if (!incomplete) {
			console.log('All tests complete')
			process.exit(0)
		}

		// Restart/kill a job if its output hasn't updated since last check
		_.forOwn(jobs, (job, name) => {
			if (previousOutputLengths[name] && previousOutputLengths[name] === job.outputLength && !job.complete) {
				if (job.retries > 0) {
					restartJob(job)
				} else {
					console.error(`Bailing out, [${name}] has no retries left`)
					process.exit(1)
				}
			}

			// Update previous output length data for next check
			previousOutputLengths[name] = job.outputLength
		})
	}, TIMEOUT)
}

/**
 * @summary Restart a single job
 * @function
 *
 * @param {Object} job - job to restart
 * @returns {Object} - restarted job
 */
const restartJob = (job) => {
	console.log(`[${job.name}] No new output from job, restarting...`)
	job.retries -= 1
	job.outputLength = 0
	job.process.kill(0)
	Reflect.deleteProperty(job, 'process')
	return startJob(job)
}

// Install packages
installPackages()

// Start and watch jobs
const jobs = startJobs()
watchJobs(jobs)
