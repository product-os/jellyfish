/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	circularDeepEqual
} from 'fast-equals'
import React, {
	useCallback,
	useState
} from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Button,
	Flex,
	Heading,
	Tabs,
	Tab
} from 'rendition'
import {
	useSetup
} from '@jellyfish/ui-components/SetupProvider'
import Column from '@jellyfish/ui-components/shame/Column'
import Icon from '@jellyfish/ui-components/shame/Icon'
import {
	selectors
} from '../../core'
import InboxTab from './InboxTab'

// Generates a basic query that matches messages against a user slug
const getBasePingQuery = (user, searchTerm) => {
	return {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [
					'message',
					'whisper',
					'message@1.0.0',
					'whisper@1.0.0'
				]
			},
			data: {
				type: 'object',
				properties: {
					payload: {
						type: 'object',
						properties: {
							message: {
								anyOf: [
									{
										pattern: `@${user.slug.slice(5)}`
									}, {
										pattern: `!${user.slug.slice(5)}`
									}
								],
								regexp: {
									pattern: searchTerm,
									flags: 'i'
								}
							}
						},
						required: [
							'message'
						],
						additionalProperties: true
					}
				},
				additionalProperties: true
			}
		},
		additionalProperties: true
	}
}

const getUnreadQuery = (user, searchTerm) => {
	return _.merge(getBasePingQuery(user, searchTerm), {
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					readBy: {
						type: 'array',
						not: {
							contains: {
								const: user.slug
							}
						}
					}
				}
			}
		}
	})
}

const getReadQuery = (user, searchTerm) => {
	return _.merge(getBasePingQuery(user, searchTerm), {
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					readBy: {
						type: 'array',
						contains: {
							const: user.slug
						},
						minLength: 1
					},
					payload: {
						type: 'object',
						properties: {
							message: {
								regexp: {
									pattern: searchTerm,
									flags: 'i'
								}
							}
						},
						required: [
							'message'
						],
						additionalProperties: true
					}
				},
				required: [
					'readBy',
					'payload'
				]
			}
		}
	})
}

const getSentQuery = (user, searchTerm) => {
	return {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [
					'message',
					'whisper',
					'message@1.0.0',
					'whisper@1.0.0'
				]
			},
			data: {
				type: 'object',
				properties: {
					actor: {
						type: 'string',
						const: user.id
					}
				},
				additionalProperties: true
			}
		},
		additionalProperties: true
	}
}

export default React.memo((props) => {
	// State controller for managing the active tab
	const [ currentTab, setCurrentTab ] = useState(0)

	// State controller for showing loading icon when marking all as read
	const [ isMarkingAllAsRead, setIsMarkingAllAsRead ] = useState(false)

	const {
		sdk
	} = useSetup()

	const user = useSelector(selectors.getCurrentUser)

	const markAllAsRead = useCallback(async () => {
		setIsMarkingAllAsRead(true)

		const cards = await sdk.query(getUnreadQuery(user, ''))

		for (const card of cards) {
			await sdk.card.markAsRead(user.slug, card)
		}

		setIsMarkingAllAsRead(false)
	}, [ user.id ])

	return (
		<Column>
			<Flex p={3} justifyContent="space-between">
				<Heading.h4>
					Inbox
				</Heading.h4>
			</Flex>

			<Tabs
				activeIndex={currentTab}
				onActive={setCurrentTab}
			>
				<Tab title="Unread">
					<InboxTab key={currentTab} getQuery={getUnreadQuery}>
						<Button
							ml={3}
							disabled={isMarkingAllAsRead}
							onClick={markAllAsRead}
							data-test="inbox__mark-all-as-read"
							icon={isMarkingAllAsRead ? <Icon name="cog" spin /> : <Icon name="check-circle" />}
						>
							Mark all read
						</Button>
					</InboxTab>
				</Tab>

				<Tab title="Read">
					<InboxTab key={currentTab} getQuery={getReadQuery} />
				</Tab>

				<Tab title="Sent">
					<InboxTab key={currentTab} getQuery={getSentQuery} />
				</Tab>
			</Tabs>
		</Column>
	)
}, circularDeepEqual)
