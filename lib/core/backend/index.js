/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const environment = require('../../environment')
const backends = {
	postgres: require('./postgres')
}

module.exports = backends[environment.database.type]
