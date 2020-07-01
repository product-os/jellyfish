/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BCRYPT_SALT_ROUNDS = 12

// See https://github.com/product-os/jellyfish/issues/2011
const PASSWORDLESS_USER_HASH = 'PASSWORDLESS'

module.exports = {
	BCRYPT_SALT_ROUNDS,
	PASSWORDLESS_USER_HASH
}
