/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const environment = require('@balena/jellyfish-environment')
const fs = require('fs')
const AWS = require('aws-sdk')
const moment = require('moment')
const uuid = require('@balena/jellyfish-uuid')
const {
	execSync
} = require('child_process')
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

const GITHUB_RETRY_COUNT = 5
const GITHUB_OWNER = 'product-os'
const GITHUB_REPO = 'jellyfish'

/**
 * @summary Take a screenshot of a browser page through puppeteer
 * @function
 *
 * @param {Object} context - test context
 * @param {String} title - test title
 *
 * @example
 * screenshot.takeScreenshot(context, test.tilte)
 */
exports.takeScreenshot = async (context, title) => {
	const testTitle = title.replace(/^.*\shook\sfor\s/, '')
	context.screenshots = (context.screenshots || 0) + 1

	const dir = './tmp/test-results/screenshots'

	// Make directory before using it
	fs.mkdirSync(dir, {
		recursive: true
	}, (err) => {
		if (err) throw err
	})

	const file = `${testTitle}.${context.screenshots}.png`
	const path = `${dir}/${file}`
	await context.page.screenshot({
		path
	})

	// Upload screenshot to S3 and comment on PR with link
	try {
		const screenshotLink = await exports.upload(path)
		if (!_.isEmpty(screenshotLink)) {
			console.log(`Screenshot uploaded to: ${screenshotLink}`)
			await exports.comment(testTitle, screenshotLink)
		}
	} catch (err) {
		console.error(`Error occurred during screenshot upload/comment: ${err}`)
	}
}

/**
 * @summary Upload failed test screenshot to S3
 * @function
 *
 * @param {String} path - file path
 * @returns {String} URL of uploaded file
 *
 * @example
 * const url = await upload('/tmp/my-screenshot.png')
 */
exports.upload = async (path) => {
	if (_.isEmpty(environment.test.ci) || _.some(_.values(environment.aws), _.isEmpty)) {
		console.log('Skipping screenshot upload, CI or AWS S3 environment variables not set')
		return ''
	}

	console.log('Uploading screenshot to S3...')
	const day = moment().utc().hour(0).minute(0).second(0).unix()
	const id = await uuid.random()
	const key = `screenshots/${day}/${id}.png`
	const object = {
		ACL: 'public-read',
		Body: fs.readFileSync(path),
		Key: key,
		Bucket: environment.aws.s3BucketName
	}
	const s3 = new AWS.S3({
		accessKeyId: environment.aws.accessKeyId,
		secretAccessKey: environment.aws.secretAccessKey
	})
	await s3.putObject(object).promise()

	return `https://${environment.aws.s3BucketName}.s3.amazonaws.com/${key}`
}

/**
 * @summary Comment on PR of failed test with error details and screenshot link
 * @function
 *
 * @param {String} testTitle - title of failed test
 * @param {String} screenshotLink - link to uploaded screenshot
 * @example
 * await comment('example error message', 'http://example.com/my-file.png')
 */
exports.comment = async (testTitle, screenshotLink) => {
	if (_.isEmpty(environment.test.ci) || _.isEmpty(environment.integration.github.api)) {
		console.log('Skipping screenshot PR comment, CI or GitHub API key environment variable not set')
		return
	}

	console.log('Posting screenshot link as a comment on PR...')

	// Set up octokit
	const octokit = new Octokit({
		request: {
			retries: GITHUB_RETRY_COUNT
		},
		auth: `token ${environment.integration.github.api}`,
		throttle: {
			onRateLimit: (retryAfter, retryOptions) => {
				return retryOptions.request.RETRY_COUNT <= GITHUB_RETRY_COUNT
			},
			onAbuseLimit: (retryAfter, retryOptions) => {
				return retryOptions.request.RETRY_COUNT <= GITHUB_RETRY_COUNT
			}
		}
	})

	// Find PR open for this branch
	const branch = _.trim(execSync('git rev-parse --abbrev-ref HEAD'))
	const {
		data: matches
	} = await octokit.pulls.list({
		owner: GITHUB_OWNER,
		repo: GITHUB_REPO,
		head: `${GITHUB_OWNER}:${branch}`
	})

	// Check that there is only one match
	if (matches.length > 1) {
		throw new Error(`Unable to find a single PR for branch "${branch}", skipping PR comment`)
	}

	// Make new comment on found PR
	await octokit.issues.createComment({
		owner: GITHUB_OWNER,
		repo: GITHUB_REPO,
		issue_number: matches[0].number,
		body: `:x: **E2E Test Failed**<br><br>Test: ${testTitle}<br>Screenshot: [Download](${screenshotLink})`
	})
}
