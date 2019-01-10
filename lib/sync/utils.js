/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')

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

exports.attachCards = (date, fromCard, toCard) => {
	return {
		time: date,
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

exports.postEvent = (sequence, eventCard, targetCard) => {
	if (!eventCard) {
		return []
	}

	const date = new Date(eventCard.data.timestamp)
	return [
		{
			time: date,
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
		})
	]
}

exports.isEmail = (string) => {
	return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(string)
}
