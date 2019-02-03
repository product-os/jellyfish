#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const fs = require('fs')
const _ = require('lodash')
const Octokit = require('@octokit/rest')
const packageJSON = require('../package.json')

const OWNER = 'balena-io'
const REPO = 'jellyfish'
const TOKEN = process.env.GITHUB_TOKEN
const PR = process.argv[2] && parseInt(_.last(process.argv[2].split('/')), 10)
const FILE = process.argv[3]

if (!TOKEN) {
	console.error('Please set GITHUB_TOKEN in order to use this script')
	process.exit(1)
}

if (!PR || isNaN(PR) || !FILE) {
	console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <number> <body>`)
	process.exit(1)
}

const BODY = fs.readFileSync(FILE, {
	encoding: 'utf8'
})

const github = new Octokit({
	headers: {
		accept: 'application/vnd.github.v3+json',
		'user-agent': `${packageJSON.name} v${packageJSON.version}`
	}
})

github.authenticate({
	type: 'token',
	token: TOKEN
})

github.users.getAuthenticated().then(async (authenticated) => {
	const username = authenticated.data.login
	console.log(`Authenticated as ${username}`)
	console.log(`Fetching comments on ${OWNER}/${REPO} #${PR}`)

	const comments = await github.issues.listComments({
		owner: OWNER,
		repo: REPO,
		number: PR,
		per_page: 100
	})

	const summaryComment = comments.data.find((comment) => {
		return comment.user.login === username
	})

	if (summaryComment) {
		console.log(`Updating ${summaryComment.html_url}`)
		await github.issues.updateComment({
			owner: OWNER,
			repo: REPO,
			comment_id: summaryComment.id,
			body: BODY
		})
	} else {
		console.log('Creating new comment')
		await github.issues.createComment({
			owner: OWNER,
			repo: REPO,
			number: PR,
			body: BODY
		})
	}
}).catch((error) => {
	console.error(error)
	process.exit(1)
})
