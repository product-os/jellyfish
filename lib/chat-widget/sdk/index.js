import _ from 'lodash'
import * as environment from '../../ui/environment'
import {
	getSdk as createJellyfishSdk
} from '../../sdk'

export const createSdk = ({
	authToken
}) => {
	const jellyfish = createJellyfishSdk({
		authToken,
		apiPrefix: environment.api.prefix,
		apiUrl: environment.api.url
	})

	return {
		fetchConversations: async ({
			skip, limit
		}) => {
			return (await jellyfish.query(
				{
					$$links: {
						'has attached element': {
							type: 'object',
							additionalProperties: true
						}
					},
					properties: {
						links: {
							type: 'object',
							additionalProperties: true
						},
						type: {
							const: 'support-thread'
						}
					},
					additionalProperties: true
				},
				{
					skip,
					limit
				}
			)).map((card) => {
				const timeline = _.sortBy(_.get(card.links, [ 'has attached element' ], []), 'data.timestamp')
				let latestText = null

				// Find the most recent message
				for (let index = timeline.length - 1; index >= 0; index--) {
					const event = timeline[index]

					if (event.type === 'message') {
						latestText = _.get(event, [ 'data', 'payload', 'message' ], '')
							.split('\n')
							.shift()
						break
					}

					if (event.type === 'update' && Boolean(event.name)) {
						latestText = event.name
						break
					}
				}

				return {
					id: card.id,
					created_at: card.created_at,
					subject: card.data.description,
					blurb: latestText
				}
			})
		}
	}
}
