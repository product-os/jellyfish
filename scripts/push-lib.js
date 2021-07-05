#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/*
 * This script is a part of the Livepush development flow.
 * It creates an npm tarball of a library cloned under .libs
 * and copies it to package directories for apps that use it.
 * Usage: ./scripts/push-lib.js <library-name>
 */

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const pkg = args[0]
if (pkg.length < 1) {
	console.error('Please set package name')
	process.exit(1)
}

// Create tarball from package
const tarball = childProcess.execSync('npm pack', {
	cwd: path.join(process.cwd(), '.libs', pkg),
	stdio: 'pipe'
}).toString().trim().split('\n').pop()
const tarballPath = path.join(process.cwd(), '.libs', pkg, tarball)
console.log(`Created ${tarballPath}`)

// Copy created package to apps packages
for (const app of fs.readdirSync(path.join(process.cwd(), 'apps'))) {
	const packageLockPath = path.join(process.cwd(), 'apps', app, 'package-lock.json')
	const packageLock = fs.readFileSync(packageLockPath).toString()
	if (packageLock.includes(pkg)) {
		const dest = path.join(process.cwd(), 'apps', app, 'packages', `${pkg}.tgz`)
		fs.copyFileSync(tarballPath, dest)
		console.log(`Copied package to ${dest}`)
	}
}
