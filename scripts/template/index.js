const mustache = require('mustache')
const fs = require('fs')
const TEMPLATE = process.argv[2]

if (!TEMPLATE) {
	console.error('Pass a template file as an argument')
	process.exit(1)
}

console.error(`Opening ${TEMPLATE}`)
const contents = fs.readFileSync(TEMPLATE, 'utf8')

console.log(mustache.render(contents, Object.assign({}, process.env, {
	workers: [ {
		name: 'api',
		idx: 0,
		port: 80
	}, {
		name: 'worker_1',
		idx: 1,
		port: 88
	} ]
})))
console.error(`Done rendering ${TEMPLATE}`)
