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

exports.getTimeline = async (jellyfish, session, id, options) => {
	const card = await jellyfish.getCardById(session, id, options)
	if (!card) {
		throw new jellyfish.errors.JellyfishNoElement(`Unknown id: ${id}`)
	}

	// TODO: If views could be parameterized, then
	// this function could call .queryView() instead
	return jellyfish.query(session, {
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					target: {
						type: 'string',
						const: card.id
					}
				},
				additionalProperties: true,
				required: [ 'target' ]
			}
		},
		additionalProperties: true,
		required: [ 'data' ]
	}, options)
}
