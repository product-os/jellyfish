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
	useState
} from 'react'
import {
	Flex,
	Heading,
	Tabs,
	Tab
} from 'rendition'
import Column from '../../../../lib/ui-components/shame/Column'
import InboxTab from './InboxTab'

const mergeWithUniqConcatArrays = (objValue, srcValue) => {
	if (_.isArray(objValue)) {
		return _.uniq(objValue.concat(srcValue))
	}
	// eslint-disable-next-line no-undefined
	return undefined
}

const withSearch = (query, searchTerm) => {
	if (searchTerm) {
		return _.mergeWith(query, {
			properties: {
				data: {
					properties: {
						payload: {
							properties: {
								message: {
									regexp: {
										pattern: searchTerm,
										flags: 'i'
									}
								}
							},
							required: [ 'message' ]
						}
					}
				}
			}
		}, mergeWithUniqConcatArrays)
	}
	return query
}

// Generates a basic query that matches messages against a user slug
const getBasePingQuery = (user, searchTerm) => {
	const query = {
		type: 'object',
		required: [ 'data', 'type' ],
		properties: {
			type: {
				type: 'string',
				enum: [
					'message@1.0.0',
					'whisper@1.0.0'
				]
			},
			data: {
				type: 'object',
				required: [ 'payload' ],
				properties: {
					payload: {
						type: 'object',
						properties: {
							mentionsUser: {
								type: 'array',
								contains: {
									const: user.slug
								}
							}
						},
						required: [
							'mentionsUser'
						],
						additionalProperties: true
					}
				},
				additionalProperties: true
			}
		},
		additionalProperties: true
	}

	return withSearch(query, searchTerm)
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
	return withSearch({
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [
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
	}, searchTerm)
}

export default React.memo((props) => {
	// State controller for managing the active tab
	const [ currentTab, setCurrentTab ] = useState(0)

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
					<InboxTab
						key={currentTab}
						getQuery={getUnreadQuery}
						canMarkAsRead
					/>
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
