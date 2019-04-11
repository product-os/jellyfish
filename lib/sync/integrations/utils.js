/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Turndown = require('turndown')

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
			type: 'link',
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

exports.parseHTML = (string) => {
	const turndown = new Turndown({
		codeBlockStyle: 'fenced',
		br: ''
	})

	const markdown = turndown.turndown(
		string.replace(/(<br>\n)/g, '<br>'))
	return _.trim(markdown, ' \n')
}
