/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* eslint-disable id-length */

/*
 * This script looks through a GitHub repository and closes issues that were created two or more days ago.
 * Usage: node ./scripts/ci/github-close-issues.js INTEGRATION_GITHUB_TOKEN=<...>
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const {
	throttling
} = require('@octokit/plugin-throttling')
const {
	retry
} = require('@octokit/plugin-retry')
const Octokit = require('@octokit/rest').Octokit.plugin(
	retry,
	throttling
)
const environment = require('@balena/jellyfish-environment')

const moment = require('moment')
const packageJSON = require('../../package.json')

const DELAY = 500
const RETRY_COUNT = 5
const SINCE = moment.utc().subtract(2, 'days').format('YYYY-MM-DD')

/**
 * @summary Close old GitHub issues in the Jellyfish test repository
 * @param {Object} options - required GitHub options
 * @function
 *
 * @returns {Promise<Number>} number of issues closed
 */
const closeIssues = async (options) => {
	const context = {
		closed: [],
		owner: options.repo.split('/')[0],
		repo: options.repo.split('/')[1],
		octokit: new Octokit({
			request: {
				retries: RETRY_COUNT
			},
			userAgent: `${packageJSON.name} v${packageJSON.version}`,
			auth: `token ${options.token}`,
			throttle: {
				onRateLimit: (retryAfter, retryOptions) => {
					return retryOptions.request.RETRY_COUNT <= RETRY_COUNT
				},
				onAbuseLimit: (retryAfter, retryOptions) => {
					return retryOptions.request.RETRY_COUNT <= RETRY_COUNT
				}
			}
		})
	}

	// Search for old issues.
	const query = `repo:${options.repo}+is:issue+is:open+created:<${SINCE}`

	while (true) {
		// Search for old test issues.
		let results = {}
		try {
			results = await context.octokit.search.issuesAndPullRequests({
				q: query,
				per_page: 100
			})
		} catch (err) {
			handleError(err, 0)
		}

		// Break loop if no issues were found.
		if (!_.get(results, [ 'data', 'items', 'length' ])) {
			break
		}

		await Bluebird.each(results.data.items, async (issue) => {
			await closeIssue(context, issue)
			context.closed.push(issue.number)
			await Bluebird.delay(DELAY)
		})
	}

	return context.closed.length
}

/**
 * @summary Close a single GitHub issue
 * @function
 *
 * @param {Object} context - Data/objects needed to call GitHub API
 * @param {Object} issue - Title and number of an issue to close
 */
const closeIssue = async (context, issue) => {
	if (_.includes(context.closed, issue.number)) {
		return
	}
	console.log(`Closing issue ${issue.title} (${issue.number})`)
	try {
		await context.octokit.issues.update({
			owner: context.owner,
			repo: context.repo,
			issue_number: issue.number,
			state: 'closed'
		})
	} catch (err) {
		handleError(err, 0)
	}
}

/**
 * @summary Validate set options
 * @function
 *
 * @param {Object} options - GitHub options
 */
const validate = (options) => {
	// Check that the GitHub token is set.
	if (!options.token) {
		handleError('Must set INTEGRATION_GITHUB_TOKEN', 1)
	}

	// Check that the GitHub test repository name is set.
	if (!options.repo) {
		handleError('Must set TEST_INTEGRATION_GITHUB_REPO', 1)
	}
}

/**
 * @summary Handle errors
 * @function
 *
 * @param {String} msg - error message
 * @param {Number} code - code to exit with
 */
const handleError = (msg, code) => {
	console.error(msg)
	process.exit(code)
}

// Set required options and validate them.
const options = {
	token: environment.integration.github.api,
	repo: environment.test.integration.github.repo
}
validate(options)

// Close old issues using provided options.
closeIssues(options)
	.then((total) => {
		console.log(`Successfully closed ${total} issues`)
	})
	.catch((err) => {
		console.error(err)
	})
