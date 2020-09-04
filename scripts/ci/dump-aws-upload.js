#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/*
 * This script dumps Postgres database data and stores it on AWS S3.
 * The <TYPE> argument refers to the dump type, e2e-server for example.
 * Usage: AWS_ACCESS_KEY_ID=<...> AWS_S3_BUCKET_NAME=<...> AWS_SECRET_ACCESS_KEY=<...> \
 *   ./scripts/ci/dump-aws-upload.js <FILE>
 */

const _ = require('lodash')
const AWS = require('aws-sdk')
const environment = require('@balena/jellyfish-environment')
const execSync = require('child_process').execSync
const fs = require('fs')

/**
 * @summary Get git commit hash
 * @function
 *
 * @returns {String} git commit hash
 *
 * @example
 * const hash = getCommitHash()
 */
const getCommitHash = () => {
	const command = 'git log --pretty="%H" | head -n 1'
	return _.trim(execSync(command).toString())
}

/**
 * @summary Check if a value is a non-empty string
 * @function
 *
 * @param {String} value - value to check
 * @returns {Boolean} boolean dnoting if provided string is valid or not
 *
 * @example
 * if (isValidString('test')) {
 *   console.log('Is a valid string')
 * }
 */
const isValidString = (value) => {
	if (_.isString(value) && !_.isEmpty(value)) {
		return true
	}
	return false
}

/**
 * @summary Handle errors
 * @function
 *
 * @param {String} msg - error message
 */
const handleError = (msg) => {
	console.error(msg)
	process.exit(1)
}

/**
 * @summary Check that required options are set as valid strings
 * @function
 *
 * @param {String} type - option subset type
 * @param {Array} keys - list of required option names
 * @param {Object} options - full list of options to validate
 *
 * @example
 * const keys = [ 'host', 'database', 'user', 'password' ]
 * const options = {
 *   host: 'localhost',
 *   database: 'jellyfish',
 *   user: 'jellyfish',
 *   password: 'jellyfish'
 * }
 * checkOptions('postgres', keys, options)
 */
const checkOptions = (type, keys, options) => {
	keys.forEach((key) => {
		if (!isValidString(options[key])) {
			handleError(`Must set ${type} option: ${key}`)
		}
	})
}

/**
 * @summary Validate options
 * @function
 *
 * @param {Object} options - required options to check
 *
 * @example
 * const options = {
 *   file: '/tmp/dump-server.gz',
 *   hash: getCommitHash(),
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * validate(options)
 */
const validate = (options) => {
	// Check file
	if (!isValidString(options.file)) {
		handleError('File path not set')
	}

	// Check git commit hash
	if (!isValidString(options.hash)) {
		handleError('Git commit hash not set')
	}

	// Check AWS S3 options
	checkOptions('aws', [
		'accessKeyId',
		'secretAccessKey',
		's3BucketName'
	], options.aws)
}

/**
 * @summary Upload Postgres dump to S3
 * @function
 *
 * @param {String} options - process options
 *
 * @example
 * const options = {
 *   file: '/tmp/server-dump.gz',
 *   hash: getCommitHash(),
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * await upload(options)
 */
const upload = async (options) => {
	console.log('Uploading dump to S3...')
	const key = `dumps/${options.hash}_e2e-server.gz`
	const object = {
		Body: fs.readFileSync(options.file),
		Key: key,
		Bucket: environment.aws.s3BucketName
	}
	const s3 = new AWS.S3({
		accessKeyId: options.aws.accessKeyId,
		secretAccessKey: options.aws.secretAccessKey
	})
	await s3.putObject(object).promise()

	return `https://${options.aws.s3BucketName}.s3.amazonaws.com/${key}`
}

// Prepare options
const options = {
	file: process.argv[2],
	hash: getCommitHash(),
	aws: environment.aws
}

// Validate required environment variables and command argument
validate(options)

// Create dump and upload to S3
upload(options).then((url) => {
	console.log(`Uploaded to ${url}`)
})
