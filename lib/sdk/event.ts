/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { SDKInterface } from './index';
import { Event, EventRequest } from './types';


/**
 * @namespace JellyfishSDK.event
 */
export class EventSdk {
	constructor(private sdk: SDKInterface) {}

	/**
	 * @summary Create a new event
	 * @name create
	 * @public
	 * @function
	 * @memberof JellyfishSDK.event
	 *
	 * @description Send an action request to create a new event
	 *
	 * @param {Object} card - The card that should be created, must include
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
	public create(event: EventRequest): Bluebird<Event> {
		return this.sdk.action<Event>({
			card: event.target.id,
			type: event.target.type,
			action: 'action-create-event',
			arguments: _.assign(
				{
					payload: {},
					tags: [],
				},
				_.omit(event, [ 'target' ]),
			),
		});
	}

}
