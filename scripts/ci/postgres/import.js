#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/*
 * This script imports the most recent Postgres dump stored on S3.
 * The <TYPE> argument refers to the dump type, e2e-server for example.
 * Usage: AWS_ACCESS_KEY_ID=<...> AWS_S3_BUCKET_NAME=<...> AWS_SECRET_ACCESS_KEY=<...> \
 *   POSTGRES_HOST=<...> POSTGRES_DATABASE=<...> POSTGRES_USER=<...> POSTGRES_PASSWORD=<...> \
 *   ./scripts/ci/postgres/import.js <TYPE>
 */

const environment = require('@balena/jellyfish-environment').defaultEnvironment
const execSync = require('child_process').execSync
const fs = require('fs')
const isEmpty = require('lodash').isEmpty
const utils = require('./utils')

/**
 * @summary Get previous dump commit hash
 * @function
 *
 * @param {Object} options - process options
 * @returns {String} git commit hash
 *
 * @example
  * const options = {
 *   type: 'e2e-server',
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * const hash = getCommitHash(options)
 */
const getCommitHash = async (options) => {
	let commitHash = ''
	const command = 'git log --pretty="%H" | tail +2 | head -n 40'
	const output = execSync(command).toString()
	if (output.trim() === '') {
		utils.handleError('Failed to get git commit hash')
	}
	const hashes = output.split(/\r?\n/)
	hashes.pop()
	for await (const hash of hashes) {
		try {
			await options.s3.headObject({
				Bucket: options.aws.s3BucketName,
				Key: `${utils.S3_KEY_PREFIX}/${utils.getDumpArchiveName(hash, options.type)}`
			}).promise()
			commitHash = hash
			break
		} catch (error) {
			console.log('Looking for previous dump archive...')
		}
	}

	return commitHash
}

/**
 * @summary Extract dump archive
 * @function
 *
 * @param {String} file - dump archive file path
 * @returns {String} extract path
 *
 * @example
 * const dumpPath = extract('/tmp/postgres-dump.gz')
 */
const extract = (file) => {
	try {
		execSync(`gunzip ${file}`)
	} catch (error) {
		utils.handleError(error)
	}
	return file.replace('.gz', '')
}

/**
 * @summary Import dump into Postgres database
 * @function
 *
 * @param {Object} options - process options
 * @param {String} file - dump file path
 *
 * @example
 * const options = {
 *   type: 'e2e-server',
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * const file = '/tmp/dump'
 * importDump(options, file)
 */
const importDump = (options, file) => {
	const {
		host,
		database,
		user,
		password
	} = options.postgres
	const command = `psql template1 -h "${host}" --username="${user}"`
	const execOptions = {
		env: {
			PGPASSWORD: password
		}
	}
	execSync(`${command} -c "create user ${user};" || true`, execOptions)
	execSync(`${command} -c "drop database ${database};" || true`, execOptions)
	execSync(`${command} -c "create database ${database} with owner ${user};" || true`, execOptions)
	execSync(`${command} < "${file}"`, execOptions)
}

/**
 * @summary Download Postgres dump from S3
 * @function
 *
 * @param {Object} options - process options
 * @returns {String} local path of downloaded file
 *
 * @example
 * const options = {
 *   type: 'e2e-server',
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * const file = await download(options)
 */
const download = async (options) => {
	const file = utils.getDumpArchivePath(options.hash, options.type)
	try {
		const object = await options.s3.getObject({
			Key: `dumps/${utils.getDumpArchiveName(options.hash, options.type)}`,
			Bucket: environment.aws.s3BucketName
		}).promise()
		fs.writeFileSync(file, object.Body)
	} catch (error) {
		utils.handleError(`Failed to download dump: ${error}`)
	}

	return file
}

/**
 * @summary Download and import latest Postgres dump
 * @function
 *
 * @example
 * run()
 */
const run = async () => {
	// Prepare options
	const options = {
		type: process.argv[2],
		postgres: environment.postgres,
		aws: environment.aws
	}

	// Validate required environment variables
	utils.validate(options)

	// Instantiate s3
	options.s3 = utils.initS3(options)

	// Get most recent dumps commit hash
	options.hash = await getCommitHash(options)
	if (isEmpty(options.hash)) {
		utils.handleError(`Could not find commit hash for previous ${options.type} dump`)
	}

	// Download dump and extract
	console.log('Downloading dump from storage...')
	const file = await download(options)
	console.log(`Downloaded dump to ${file}`)
	const extracted = extract(file)

	// Import dump into database
	console.log(`Importing dump ${extracted}...`)
	importDump(options, extracted)
	console.log(`Dump imported to ${options.postgres.database}`)
}

run()
