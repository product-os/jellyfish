/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const skhema = require('skhema')
const errors = require('./errors')
skhema.SchemaMismatch = errors.JellyfishSchemaMismatch
module.exports = skhema
