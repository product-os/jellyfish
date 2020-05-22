/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const url = require('native-url')
const Turndown = require('turndown')

/**
 * @summary Convert to slug-compatible string
 * @function
 * @private
 *
 * @param {String} string - string to convert
 * @returns {String} slugified string
 */
exports.slugify = (string) => {
	return string
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

/**
 * @summary Get a date object from an epoch number
 * @function
 * @private
 *
 * @param {Number} epoch - epoch date
 * @returns {Date} date object
 */
exports.getDateFromEpoch = (epoch) => {
	return new Date(epoch * 1000)
}

/**
 * @summary Patch an object
 * @function
 * @private
 *
 * @param {Object} object - source object
 * @param {Object} delta - change delta
 * @returns {Object} patched object
 */
exports.patchObject = (object, delta) => {
	return _.mergeWith(_.cloneDeep(object), delta, (objectValue, sourceValue) => {
		// Always do array overrides
		if (_.isArray(sourceValue)) {
			return sourceValue
		}

		// _.mergeWith expected undefined
		// eslint-disable-next-line no-undefined
		return undefined
	})
}

exports.attachCards = (date, fromCard, toCard, options) => {
	return {
		time: date,
		actor: options.actor,
		card: {
			slug: `link-${fromCard.slug}-is-attached-to-${toCard.slug}`,
			type: 'link@1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: fromCard.id,
					type: fromCard.type
				},
				to: {
					id: toCard.id,
					type: toCard.type
				}
			}
		}
	}
}

exports.postEvent = (sequence, eventCard, targetCard, options) => {
	if (!eventCard) {
		return []
	}

	const date = new Date(eventCard.data.timestamp)
	return [
		{
			time: date,
			actor: options.actor,
			card: eventCard
		},
		exports.attachCards(date, {
			id: {
				$eval: `cards[${sequence.length}].id`
			},
			slug: eventCard.slug,
			type: eventCard.type
		}, {
			id: eventCard.data.target,
			slug: targetCard.slug,
			type: targetCard.type
		}, {
			actor: options.actor
		})
	]
}

exports.isEmail = (string) => {
	return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(string)
}

exports.parseHTML = (string, options = {}) => {
	const turndown = new Turndown({
		codeBlockStyle: 'fenced',
		br: ''
	})

	// Preserve these structural elements so that discourse previews can be
	// rendered correctly.
	// turndown.keep() is not used here as that method does not recurse into
	// nested elements.
	turndown.addRule('div', {
		filter: [
			'article',
			'aside',
			'div',
			'header'
		],
		replacement: (content, node) => {
			node.innerHTML = turndown.turndown(node.innerHTML)
			return node.outerHTML
		}
	})

	turndown.addRule('inlineLink', {
		filter: (node) => {
			return node.nodeName === 'A' && node.getAttribute('href')
		},
		replacement: (content, node) => {
			const href = node.getAttribute('href')
			const fullUrl = options.baseUrl
				? url.resolve(options.baseUrl, href)
				: href
			const title = node.title
				? ` "${node.title}"`
				: ''
			return `[${content}](${fullUrl}${title})`
		}
	})

	turndown.addRule('removeStyle', {
		filter: 'style',
		replacement: _.constant('')
	})

	turndown.addRule('image', {
		filter: 'img',
		replacement: (content, node) => {
			const src = node.getAttribute('src')
			if (!src) {
				return ''
			}

			if (node.getAttribute('width') === '1' &&
				node.getAttribute('height') === '1') {
				return ''
			}

			const fullUrl = options.baseUrl
				? url.resolve(options.baseUrl, src)
				: src
			node.setAttribute('src', fullUrl)
			return node.outerHTML
		}
	})

	// Normalize br tags and remove top level div wrappers before parsing
	let preparsed = string.replace(/(<br>\n)/g, '<br>').trim()
	const tagOpen = '<div>'
	const tagClose = '</div>'

	// Without using Dom emulation its difficult to know that we're not
	// accidentally mangling html when removing these div elements, so only
	// continue if the string contains a single wrapper div. For most cases this
	// is sufficient
	if (
		(preparsed.match(/<div>/g) || []).length === 1 &&
		_.startsWith(preparsed, tagOpen) &&
		preparsed.lastIndexOf(tagClose) === preparsed.length - tagClose.length
	) {
		preparsed = preparsed.slice(tagOpen.length, -tagClose.length)
	}

	const markdown = turndown.turndown(preparsed)
	return _.trim(markdown, ' \n')
}
