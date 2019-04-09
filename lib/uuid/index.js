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
module.exports = async () => {
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
