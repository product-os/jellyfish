/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	initialize
} = require('./mixins')

module.exports = {
	'action-request': initialize(require('./action-request')),
	action: initialize(require('./action')),
	card: initialize(require('./card')),
	role: initialize(require('./role')),
	org: initialize(require('./org')),
	event: initialize(require('./event')),
	link: initialize(require('./link')),
	session: initialize(require('./session')),
	type: initialize(require('./type')),
	'user-admin': initialize(require('./user-admin')),
	user: initialize(require('./user')),
	'role-user-admin': initialize(require('./role-user-admin')),
	view: initialize(require('./view'))
}
