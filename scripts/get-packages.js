#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This script is used to populate the /packages directory
// at the root of the repo with packages needed for development

const execSync = require('child_process').execSync
const fs = require('fs')
const packages = require('../packages.json')
const path = require('path')

const PACKAGES_DIR = 'packages'
const PACKAGES_PATH = path.resolve(process.cwd(), PACKAGES_DIR)

/**
 * @summary Clean out packages
 * @function
 */
const clean = () => {
	execSync(`rm -fr ${PACKAGES_PATH}/*`)
}

/**
 * @summary Get all packages defined in packages.json
 * @function
 *
 * @param {String} url - url of git repo to clone
 */
const get = (url) => {
	const name = url.split('/')[1].replace('.git', '')

	// Clone repository and run npm install
	log(`Getting ${url}...`)
	execSync(`git clone ${url}`, {
		cwd: PACKAGES_PATH
	})

	// Build typescript projects
	if (fs.existsSync(path.resolve(PACKAGES_PATH, name, 'tsconfig.json'))) {
		log(`Building ${name}...`)
		execSync('npm install && npm run build', {
			cwd: path.resolve(PACKAGES_PATH, name)
		})
		execSync(`rm -fr ${path.resolve(PACKAGES_PATH, name, 'node_modules')}`)
	}
}

/**
 * @summary Output log message
 * @function
 *
 * @param {String} msg - message to output
 */
const log = (msg) => {
	console.log(`[get-packages] ${msg}`)
}

clean()
packages.forEach((url) => {
	get(url)
})
