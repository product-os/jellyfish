#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/**
 * This script runs test scripts as background jobs, monitoring output and
 * restarting/killing non-responsive jobs as necessary.
 */

const _ = require('lodash')
const fs = require('fs')
const moment = require('moment')
const yaml = require('js-yaml')
const {
	exec,
	execSync
} = require('child_process')

const RETRY_TIMEOUT = 120
const WATCH_TIMEOUT = 5 * 1000
const RETRIES = 3
const JF_DIR = '/usr/src/jellyfish'
const SCRIPTS_DIR = `${JF_DIR}/scripts`

/**
 * @summary Generates and returns the current unix timestamp
 * @function
 *
 * @returns {Number} current unix timestamp
 */
const getTimestamp = () => {
	return moment().utc().unix()
}

const START = getTimestamp()

/**
 * @summary Checkout master to make it accessible as a local branch
 * @function
 * @todo Remove this function once balenaCI checks out master after fetch
 */
const checkoutMaster = () => {
	const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
		cwd: JF_DIR
	})
	execSync('git config user.name "balena-ci" && git config user.email "balena-ci@balena.io"', {
		cwd: JF_DIR
	})
	execSync('git stash && git checkout master', {
		cwd: JF_DIR
	})
	execSync(`git checkout ${currentBranch}`, {
		cwd: JF_DIR
	})
	execSync('git stash pop', {
		cwd: JF_DIR
	})
}

/**
 * @summary Install required npm packages
 * @function
 */
const installPackages = () => {
	execSync(`cd ${SCRIPTS_DIR}/template && npm install`)
}

const readConfig = () => {
	return yaml.safeLoad(fs.readFileSync(`${SCRIPTS_DIR}/ci/tests/config.yml`, 'utf8'))
}

/**
 * @summary Start all *.spec.sh scripts as background jobs
 * @function
 *
 * @param {Object} config - job config
 *
 * @returns {Object} started jobs
 */
const startJobs = (config) => {
	for (const [ name, job ] of Object.entries(config.jobs)) {
		job.name = name
		job.running = false
		job.complete = false
		job.output = 0
		job.retries = RETRIES
		job.updated = getTimestamp()
		if (!job.depends_on) {
			startJob(job)
		}
	}
	return config.jobs
}

/**
 * @summary Start a single job
 * @function
 *
 * @param {Object} job - job to start
 * @returns {Object} the job that was started
 */
const startJob = (job) => {
	const env = (job.environment) ? Object.assign({}, process.env, job.environment) : process.env
	job.running = true
	job.process = exec(job.command, {
		cwd: JF_DIR,
		env
	}, (err, stdout, stderr) => {
		job.running = true
		if (err) {
			console.error(`[${job.name}] Job exited with error ${err}`)
			console.error(`[${job.name}] stderr: ${stderr}`)
			if (job.required) {
				process.exit(1)
			}
			job.result = 'fail'
		} else {
			job.result = 'pass'
		}
		job.complete = true
	})
	job.process.stdout.on('data', (data) => {
		job.output += data.length
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
	const previousOutputs = {}
	setInterval(() => {
		// Exit if all jobs are complete
		if (!_.find(jobs, {
			complete: false
		})) {
			console.log(`All tests complete: ${getTimestamp() - START} seconds`)
			process.exit(0)
		}

		// Restart/kill a job if its output hasn't updated since last check
		_.forOwn(jobs, (job, name) => {
			if (getTimestamp() - job.updated >= RETRY_TIMEOUT &&
				!job.complete && job.required &&
				previousOutputs[name] && previousOutputs[name] === job.output) {
				if (job.retries > 0) {
					restartJob(job)
				} else {
					console.error(`Bailing out, [${name}] has no retries left`)
					process.exit(1)
				}
			}

			// Update previous output length and updated for next check
			if (job.output > previousOutputs[name]) {
				job.updated = getTimestamp()
			}
			previousOutputs[name] = job.output
		})

		// Start jobs whose dependencies have completed and are not already started or complete
		_.forOwn(jobs, (job) => {
			if (job.depends_on && !job.complete && !job.running) {
				let dependenciesComplete = true
				let hasFailedDependency = false
				job.depends_on.forEach((dependency) => {
					if (!jobs[dependency].complete) {
						dependenciesComplete = false
					}
					if (jobs[dependency].result && jobs[dependency].result === 'fail') {
						hasFailedDependency = true
					}
				})
				if (hasFailedDependency) {
					job.complete = true
					job.running = false
				} else if (dependenciesComplete) {
					startJob(job)
				}
			}
		})
	}, WATCH_TIMEOUT)
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
	job.output = 0
	job.updated = getTimestamp()
	job.process.kill(0)
	Reflect.deleteProperty(job, 'process')
	return startJob(job)
}

// Checkout master branch
checkoutMaster()

// Install packages
installPackages()

// Start and watch jobs
const config = readConfig()
const jobs = startJobs(config)
watchJobs(jobs)
