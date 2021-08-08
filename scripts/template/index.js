/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const mustache = require('mustache')
const fs = require('fs')
const TEMPLATE = process.argv[2]

if (!TEMPLATE) {
	console.error('Pass a template file as an argument')
	process.exit(1)
}

console.error(`Opening ${TEMPLATE}`)
const contents = fs.readFileSync(TEMPLATE, 'utf8')

process.stdout.write(mustache.render(contents, Object.assign({}, process.env, {
	workers: [ {
		idx: 1
	}, {
		idx: 2
	} ]
})))
console.error(`\nDone rendering ${TEMPLATE}`)
