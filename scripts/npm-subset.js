/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const hawthorn = require('hawthorn')
const FILE = process.argv[2]
const OUTPUT = process.argv[3]

if (!FILE || !OUTPUT) {
	console.error('Pass the entry point file and the output directory as an argument')
	process.exit(1)
}

const getRealPackageName = (name) => {
	return name
		.split('/')
		.slice(0, name.startsWith('@') ? 2 : 1)
		.join('/')
}

hawthorn([ FILE ], {
	directory: process.cwd(),
	types: [ 'local', 'module' ]
}).then(async (output) => {
	const packageJSON = require(path.join(output.cwd, 'package.json'))
	const packageLockJSON = require(path.join(output.cwd, 'package-lock.json'))
	const directDependencies = new Set()
	const allDependencies = new Set()

	for (const [ name, definition ] of Object.entries(output.files)) {
		if (name.startsWith('node_modules')) {
			for (const dependency of definition.dependencies) {
				if (dependency.type !== 'module') {
					continue
				}

				allDependencies.add(getRealPackageName(dependency.path))
			}

			continue
		}

		if (definition.dynamic) {
			console.error(`Can't proceed. File ${name} contains dynamic requires`)
			process.exit(1)
		}

		for (const dependency of definition.dependencies) {
			if (dependency.type !== 'module') {
				continue
			}

			directDependencies.add(getRealPackageName(dependency.path))
		}
	}

	const packageJSONOutput = path.join(OUTPUT, 'package.json')
	const packageLockJSONOutput = path.join(OUTPUT, 'package-lock.json')

	console.log(`Writing ${packageJSONOutput}`)
	fs.writeFileSync(packageJSONOutput, JSON.stringify({
		name: packageJSON.name,
		main: FILE,
		version: packageJSON.version,
		codename: packageJSON.codename,
		private: packageJSON.private,
		description: packageJSON.description,
		homepage: packageJSON.homepage,
		repository: packageJSON.repository,
		author: packageJSON.author,
		license: packageJSON.license,
		dependencies: _.pick(packageJSON.dependencies, Array.from(directDependencies))
	}, null, 2))

	console.log(`Writing ${packageLockJSONOutput}`)
	fs.writeFileSync(packageLockJSONOutput, JSON.stringify({
		name: packageJSON.name,
		version: packageJSON.version,
		lockfileVersion: packageLockJSON.lockfileVersion,
		requires: packageLockJSON.requires,
		dependencies: _.pick(packageLockJSON.dependencies, Array.from(allDependencies))
	}, null, 2))
}).catch((error) => {
	console.error(error)
	process.exit(1)
})
