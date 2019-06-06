/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const crypto = require('crypto')

/*
 * A non blocking uuid generation function
 */
exports.random = async () => {
	return new Promise((resolve, reject) => {
		crypto.randomBytes(16, (error, buffer) => {
			if (error) {
				return reject(error)
			}

			return resolve(uuid({
				random: buffer
			}))
		})
	})
}

exports.isUUID = (string) => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		.test(string)
}
