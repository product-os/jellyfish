/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	circularDeepEqual
} from 'fast-equals'
import styled from 'styled-components'
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
import {
	queries
} from '../../core'

const InboxColumn = styled(Column) `
	[role="tabpanel"] {
		display: flex;
  	flex-direction: column;
	}
`

const getReadQuery = (user, groupNames, searchTerm) => {
	return _.merge(queries.getPingQuery(user, groupNames, searchTerm), {
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

const getSentQuery = (user, groupNames, searchTerm) => {
	return queries.withSearch({
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
		<InboxColumn>
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
						getQuery={queries.getUnreadQuery}
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
		</InboxColumn>
	)
}, circularDeepEqual)
