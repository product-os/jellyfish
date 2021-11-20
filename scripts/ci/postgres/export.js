#!/usr/bin/env node

/*
 * This script dumps Postgres database data and stores it on AWS S3.
 * The <TYPE> argument refers to the dump type, e2e-server for example.
 * Usage: AWS_ACCESS_KEY_ID=<...> AWS_S3_BUCKET_NAME=<...> AWS_SECRET_ACCESS_KEY=<...> \
 *   POSTGRES_HOST=<...> POSTGRES_DATABASE=<...> POSTGRES_USER=<...> POSTGRES_PASSWORD=<...> \
 *   ./scripts/ci/postgres/export.js <TYPE>
 */

const environment = require('@balena/jellyfish-environment').defaultEnvironment
const execSync = require('child_process').execSync
const fs = require('fs')
const utils = require('./utils')

/**
 * @summary Get current git commit hash
 * @function
 *
 * @returns {String} git commit hash
 *
 * @example
 * const hash = getCommitHash()
 */
const getCommitHash = () => {
	const command = 'git log --pretty="%H" | head -n 1'
	const output = execSync(command).toString().trim()
	if (output === '') {
		utils.handleError('Failed to get commit hash')
	}
	return output
}

/**
 * @summary Dump Postgres database to local file
 * @function
 *
 * @param {Object} options - process options
 * @returns {String} dump archive path
 *
 * @example
 * const options = {
 *   type: 'e2e-server',
 *   hash: getCommitHash(),
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * dump(options)
 */
const dump = (options) => {
	const file = utils.getDumpArchivePath(options.hash, options.type)
	const command = `pg_dump -h ${options.postgres.host} --username="${options.postgres.user}"` +
		` ${options.postgres.database} | gzip -9 > ${file}`
	execSync(command, {
		env: {
			PGPASSWORD: options.postgres.password
		}
	})

	// Make sure the file exists and is not empty
	if (!fs.existsSync(file) || execSync(`wc -l ${file} | cut -d' ' -f1`).toString().trim() === '0') {
		utils.handleError(`Failed to create Postgres dump file at ${file}`)
	}

	return file
}

/**
 * @summary Upload Postgres dump to S3
 * @function
 *
 * @param {String} options - process options
 * @param {String} file - path to dump archive
 *
 * @example
 * const options = {
 *   type: 'e2e-server',
 *   hash: getCommitHash(),
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * const file = '/tmp/dump.gz'
 * await upload(options)
 */
const upload = async (options, file) => {
	const key = `${utils.S3_KEY_PREFIX}/${utils.getDumpArchiveName(options.hash, options.type)}`
	try {
		await options.s3.putObject({
			Body: fs.readFileSync(file),
			Key: key,
			Bucket: options.aws.s3BucketName
		}).promise()
	} catch (error) {
		utils.handleError(`Failed to upload dump: ${error}`)
	}

	return `https://${options.aws.s3BucketName}.s3.amazonaws.com/${key}`
}

/**
 * @summary Dump and export current Postgres data
 * @function
 *
 * @example
 * run()
 */
const run = async () => {
	// Prepare options
	const options = {
		type: process.argv[2],
		hash: getCommitHash(),
		postgres: environment.postgres,
		aws: environment.aws
	}

	// Validate required environment variables
	utils.validate(options)

	// Instantiate s3 client
	options.s3 = utils.initS3(options)

	// Create database dump archive
	console.log(`Dumping database "${options.postgres.database}"...`)
	const file = dump(options)
	console.log(`Dumped to ${file}`)

	// Upload to storage
	console.log(`Uploading ${file} to storage...`)
	const url = await upload(options, file)
	console.log(`Uploaded dump to ${url}`)
}

run()
