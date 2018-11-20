/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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
			card: event.card,
			action: 'action-create-event',
			arguments: _.assign(
				{
					payload: {},
					tags: [],
				},
				_.omit(event, [ 'card' ]),
			),
		});
	}

}
