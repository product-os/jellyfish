/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const mirror = require('./mirror')

module.exports = {
	'action-integration-github-mirror-event': {
		card: require('./actions/action-integration-github-mirror-event'),
		pre: _.noop,
		handler: async (session, context, card, request) => {
			return mirror('github', session, context, card, request)
		}
	},
	'action-integration-front-mirror-event': {
		card: require('./actions/action-integration-front-mirror-event'),
		pre: _.noop,
		handler: async (session, context, card, request) => {
			return mirror('front', session, context, card, request)
		}
	},
	'action-integration-discourse-mirror-event': {
		card: require('./actions/action-integration-discourse-mirror-event'),
		pre: _.noop,
		handler: async (session, context, card, request) => {
			return mirror('discourse', session, context, card, request)
		}
	},
	'action-integration-outreach-mirror-event': {
		card: require('./actions/action-integration-outreach-mirror-event'),
		pre: _.noop,
		handler: async (session, context, card, request) => {
			return mirror('outreach', session, context, card, request)
		}
	},
	'action-maintain-contact': {
		card: require('./actions/action-maintain-contact'),
		pre: _.noop,
		handler: require('./handlers/action-maintain-contact').handler
	},
	'action-oauth-authorize': {
		card: require('./actions/action-oauth-authorize'),
		pre: _.noop,
		handler: require('./handlers/action-oauth-authorize').handler
	},
	'action-oauth-associate': {
		card: require('./actions/action-oauth-associate'),
		pre: _.noop,
		handler: require('./handlers/action-oauth-associate').handler
	},
	'action-broadcast': {
		card: require('./actions/action-broadcast'),
		pre: _.noop,
		handler: require('./handlers/action-broadcast').handler
	},
	'action-increment': {
		card: require('./actions/action-increment'),
		pre: _.noop,
		handler: require('./handlers/action-increment').handler
	},
	'action-ping': {
		card: require('./actions/action-ping'),
		pre: _.noop,
		handler: require('./handlers/action-ping').handler
	},
	'action-create-card': {
		card: require('./actions/action-create-card'),
		pre: _.noop,
		handler: require('./handlers/action-create-card').handler
	},
	'action-set-password': {
		card: require('./actions/action-set-password'),
		pre: require('./handlers/action-set-password').pre,
		handler: require('./handlers/action-set-password').handler
	},
	'action-create-session': {
		card: require('./actions/action-create-session'),
		pre: require('./handlers/action-create-session').pre,
		handler: require('./handlers/action-create-session').handler
	},
	'action-create-user': {
		card: require('./actions/action-create-user'),
		pre: require('./handlers/action-create-user').pre,
		handler: require('./handlers/action-create-user').handler
	},
	'action-create-event': {
		card: require('./actions/action-create-event'),
		pre: _.noop,
		handler: require('./handlers/action-create-event').handler
	},
	'action-set-add': {
		card: require('./actions/action-set-add'),
		pre: _.noop,
		handler: require('./handlers/action-set-add').handler
	},
	'action-delete-card': {
		card: require('./actions/action-delete-card'),
		pre: _.noop,
		handler: require('./handlers/action-delete-card').handler
	},
	'action-update-card': {
		card: require('./actions/action-update-card'),
		pre: _.noop,
		handler: require('./handlers/action-update-card').handler
	},
	'action-increment-tag': {
		card: require('./actions/action-increment-tag'),
		pre: _.noop,
		handler: require('./handlers/action-increment-tag').handler
	},
	'action-get-gravatar': {
		card: require('./actions/action-get-gravatar'),
		pre: _.noop,
		handler: _.noop
	},
	'action-set-user-avatar': {
		card: require('./actions/action-set-user-avatar'),
		pre: _.noop,
		handler: require('./handlers/action-set-user-avatar').handler
	},
	'action-integration-import-event': {
		card: require('./actions/action-integration-import-event'),
		pre: _.noop,
		handler: require('./handlers/action-integration-import-event').handler
	},
	'action-send-email': {
		card: require('./actions/action-send-email'),
		pre: _.noop,
		handler: require('./handlers/action-send-email').handler
	},
	'action-request-password-reset': {
		card: require('./actions/action-request-password-reset'),
		pre: _.noop,
		handler: require('./handlers/action-request-password-reset').handler
	},
	'action-complete-password-reset': {
		card: require('./actions/action-complete-password-reset'),
		pre: require('./handlers/action-complete-password-reset').pre,
		handler: require('./handlers/action-complete-password-reset').handler
	}
}
