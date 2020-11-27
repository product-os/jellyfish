#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/*
 * This script is used during Docker image builds to install any library
 * npm tarballs copied in under /usr/src/jellyfish/packages. This is a
 * part of the Livepush development flow and does not affect production/CI.
 * Usage: ./scripts/install-packages.js
 */

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')

const PKG_DIR = '/usr/src/jellyfish/packages'

for (const child of fs.readdirSync(PKG_DIR)) {
	const name = child.replace('.tgz', '')
	if (child.endsWith('.tgz') && fs.existsSync(path.join(process.cwd(), 'node_modules', '@balena', name))) {
		const fullPath = path.join(PKG_DIR, child)
		console.log(`Installing package ${fullPath}...`)
		if (fs.statSync(fullPath).isFile() && child.endsWith('.tgz')) {
			childProcess.execSync(`npm install --no-save ${fullPath}`)
		}
	}
}
