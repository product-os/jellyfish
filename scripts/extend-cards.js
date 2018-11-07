#!/usr/bin/env node

const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const _ = require('lodash')
const glob = Promise.promisifyAll(require('glob'))

const EXTENSION_PATH = process.env.EXTENSION_PATH

if (!EXTENSION_PATH) {
	throw new Error('Please set the EXTENSION_PATH environment variable')
}

const extension = JSON.parse(fs.readFileSync(EXTENSION_PATH, 'utf8'))

glob.globAsync('default-cards/**/*.json').then((matches) => {
	return Promise.map(matches, (match) => {
		return fs.readFileAsync(match, 'utf8')
			.then((contents) => {
				return {
					contents: JSON.parse(contents),
					path: match
				}
			})
	}).then((cards) => {
		return Promise.mapSeries(cards, (card) => {
			const newCard = _.extend({}, card.contents, extension)
			return fs.writeFileAsync(`${card.path}`, JSON.stringify(newCard, null, 2))
		})
	})
})
