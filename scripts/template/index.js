/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const path = require('path')
const mustache = require('mustache')
const fs = require('fs')
const mkdirp = require('mkdirp')
const {
	generateCaAndEec
} = require('./cert')

const TLD = 'ly.fish.local'
const CERTIFICATE_FOLDER = path.resolve(__dirname, '../../certs', TLD)
const TEMPLATE = process.argv[2]

if (!TEMPLATE) {
	console.error('Pass a template file as an argument')
	process.exit(1)
}

// Generate self signed ssl certificate if it does not exist
const certFiles = {
	crt: 'public.pem',
	ca: 'ca.crt',
	key: 'private.key'
}

let certificate = null
if (Object.values(certFiles).every((certFile) => {
	return fs.existsSync(path.resolve(CERTIFICATE_FOLDER, certFile))
})) {
	certificate = Object.keys(certFiles).reduce((result, key) => {
		result[key] = fs.readFileSync(path.resolve(CERTIFICATE_FOLDER, certFiles[key]), 'utf8')
		return result
	}, {})
} else {
	certificate = generateCaAndEec({
		tld: TLD
	})

	mkdirp.sync(CERTIFICATE_FOLDER)

	Object.keys(certFiles).forEach((key) => {
		fs.writeFileSync(
			path.resolve(CERTIFICATE_FOLDER, certFiles[key]),
			certificate[key],
			'utf8'
		)
	})
}

const normalize = (crt) => {
	return crt
		.trim()
		.replace(/(?:\r\n|\r|\n)/g, '\\n')
}

const BALENA_ROOT_CA = Buffer.from(normalize(certificate.ca)).toString('base64')
const JELLYFISH_CRT = normalize(`${certificate.crt}${certificate.ca}${certificate.key}`)

console.error(`Opening ${TEMPLATE}`)
const contents = fs.readFileSync(TEMPLATE, 'utf8')
console.log(mustache.render(contents, Object.assign({}, process.env, {
	BALENA_ROOT_CA,
	JELLYFISH_CRT,
	workers: [ {
		idx: 1
	}, {
		idx: 2
	} ]
})))
console.error(`Done rendering ${TEMPLATE}`)
