const _ = require('lodash')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const fs = require('fs')
const AWS = require('aws-sdk')
const startOfToday = require('date-fns/startOfToday')
const {
	v4: uuidv4
} = require('uuid')
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
 * screenshot.take(context, test.title)
 */
exports.take = async (context, title) => {
	if (!context.screenshots) {
		context.screenshots = []
	}

	// Make directory before using it
	const dir = './tmp/test-results/screenshots'
	fs.mkdirSync(dir, {
		recursive: true
	}, (err) => {
		if (err) throw err
	})

	const testTitle = title.replace(/^.*\shook\sfor\s/, '')
	const file = `${testTitle}.${context.screenshots.length + 1}.png`
	const path = `${dir}/${file}`
	await context.page.screenshot({
		path
	})

	// Upload screenshot to S3 and comment on PR with link
	try {
		const screenshotLink = await exports.upload(path)
		if (!_.isEmpty(screenshotLink)) {
			console.log(`Screenshot uploaded to: ${screenshotLink}`)
			context.screenshots.push({
				link: screenshotLink,
				title: testTitle
			})
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
	const day = startOfToday().getTime()
	const id = uuidv4()
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
 * @summary Comment on PR that had failed tests with test titles and screenshot links
 * @function
 *
 * @param {Array} screenshots - list of screenshots taken of failed tests
 *
 * @example
 * const screenshots = []
 * screenshots.push({
 *   title: 'My Test',
 *   link: 'http://example.com/screenshot.png'
 * })
 * await comment(screenshots)
 */
exports.comment = async (screenshots) => {
	// Check that all required environment variables are set
	if (_.isEmpty(environment.test.ci) || _.isEmpty(environment.integration.github.api)) {
		console.log('Skipping screenshot PR comment, CI or GitHub API key environment variable not set')
		return
	}

	// Make sure we have screenshot data to work with
	if (_.isEmpty(screenshots)) {
		console.log('Skipping screenshot PR comment, no screenshot data found')
		return
	}

	console.log('Posting screenshot links as a comment on PR...')

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

	// Build comment body
	let body = ':x: **E2E Tests Failed**'
	screenshots.forEach((screenshot) => {
		body += `<br><br>Test: ${screenshot.title}<br>Screenshot: [Download](${screenshot.link})`
	})

	// Get full list of comments on pull request
	const comments = await octokit.issues.listComments({
		owner: GITHUB_OWNER,
		repo: GITHUB_REPO,
		issue_number: matches[0].number,
		per_page: 100
	})

	// Get comment written by current user
	const authenticated = await octokit.users.getAuthenticated()
	const username = authenticated.data.login
	const prComment = comments.data.find((comment) => {
		return comment.user.login === username
	})

	// Create/update comment
	if (prComment) {
		console.log(`Updating ${prComment.html_url}`)
		await octokit.issues.updateComment({
			owner: GITHUB_OWNER,
			repo: GITHUB_REPO,
			comment_id: prComment.id,
			body
		})
	} else {
		console.log('Creating new comment')
		await octokit.issues.createComment({
			owner: GITHUB_OWNER,
			repo: GITHUB_REPO,
			issue_number: matches[0].number,
			body
		})
	}
}
