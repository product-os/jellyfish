/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

/**
 * @namespace JellyfishSDK.event
 */
class EventSdk {
	constructor (sdk) {
		this.sdk = sdk
	}

	/**
	 * @summary Create a new event
	 * @name create
	 * @public
	 * @function
	 * @memberof JellyfishSDK.event
	 *
	 * @description Send an action request to create a new event
	 *
	 * @param {Object} event - The card that should be created, must include
	 * a 'type' attribute.
	 *
	 * @fulfil {Event} - The newly created event
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.event.create({
	 * 	card: '1234-5687',
	 * 	data: {
	 * 		description: 'lorem ipsum dolor sit amet'
	 * 	}
	 * })
	 * 	.then((id) => {
	 * 		console.log(id)
	 * 	})
	 */
	create (event) {
		return this.sdk.action({
			card: event.target.id,
			type: event.target.type,
			action: 'action-create-event@1.0.0',
			arguments: _.assign({
				payload: {},
				tags: []
			}, _.omit(event, [ 'target' ]))
		})
	}
}
exports.EventSdk = EventSdk
