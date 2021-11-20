#!/usr/bin/env node

/*
 * This script posts a summary on the pull request as a comment.
 * Usage: INTEGRATION_GITHUB_TOKEN=<...> ./github-pr-summary.js
 */

const _ = require('lodash')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const execSync = require('child_process').execSync
const Octokit = require('@octokit/rest').Octokit
const packageJSON = require('../../package.json')
const utils = require('./utils')

// GitHub repository name, owner, and comment body
const OWNER = 'product-os'
const REPO = 'jellyfish'
const BODY = 'Ship shape and ready to sail!'

/**
 * @summary Get pull request number for the current branch
 * @function
 *
 * @param {Object} octokit - octokit instance
 * @returns {Number} pull request number
 *
 * @example
 * const prNumber = await getPullRequestNumber(octokit)
 */
const getPullRequestNumber = async (octokit) => {
	// Find PR open for this branch
	const branch = _.trim(execSync('git rev-parse --abbrev-ref HEAD'))
	const {
		data: matches
	} = await octokit.pulls.list({
		owner: OWNER,
		repo: REPO,
		head: `${OWNER}:${branch}`
	})

	// Check that there is only one match
	if (matches.length !== 1) {
		utils.handleError(`Found multiple PRs for branch ${branch}`)
	}

	return matches[0].number
}

/*
 * @summary Validate required options
 * @function
 *
 * @example
 * validate()
 */
const validate = () => {
	// Check that the GitHub token is set
	if (!utils.isValidString(environment.integration.github.api)) {
		utils.handleError('Must set INTEGRATION_GITHUB_TOKEN')
	}
}

// Validate required options
validate()

// Set up Octokit GitHub client
const octokit = new Octokit({
	auth: environment.integration.github.api,
	headers: {
		accept: 'application/vnd.github.v3+json',
		'user-agent': `${packageJSON.name} v${packageJSON.version}`
	}
})

// Post summary comment on pull request
octokit.users.getAuthenticated().then(async (authenticated) => {
	// Get pull request number
	const prNumber = await getPullRequestNumber(octokit)

	// Get username
	const username = authenticated.data.login
	console.log(`Authenticated as ${username}`)
	console.log(`Fetching comments on ${OWNER}/${REPO} #${prNumber}`)

	// Get full list of comments on pull request
	const comments = await octokit.issues.listComments({
		owner: OWNER,
		repo: REPO,
		issue_number: prNumber,
		per_page: 100
	})

	// Get comment written by current user
	const summaryComment = comments.data.find((comment) => {
		return comment.user.login === username
	})

	// Create/update comment
	if (summaryComment) {
		console.log(`Updating ${summaryComment.html_url}`)
		await octokit.issues.updateComment({
			owner: OWNER,
			repo: REPO,
			comment_id: summaryComment.id,
			body: BODY
		})
	} else {
		console.log('Creating new comment')
		await octokit.issues.createComment({
			owner: OWNER,
			repo: REPO,
			issue_number: prNumber,
			body: BODY
		})
	}
}).catch((error) => {
	utils.handleError(error)
})
