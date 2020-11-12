/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
import {
	Column
} from '@balena/jellyfish-ui-components'
import InboxTab from './InboxTab'
import * as queries from './queries'

const InboxColumn = styled(Column) `
	[role="tabpanel"] {
		display: flex;
	  flex-direction: column;
	  height: 100vh;
	}
`

const Inbox = ({
	removeViewDataItem,
	loadMoreViewData,
	loadViewData
}) => {
	// State controller for managing the active tab
	const [ currentTab, setCurrentTab ] = useState(0)

	const defaultTabProps = {
		removeViewDataItem,
		loadMoreViewData,
		loadViewData,
		currentTab,
		key: currentTab
	}

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
						{ ...defaultTabProps }
						getQuery={queries.getUnreadQuery}
						streamId="inbox-unread"
						canMarkAsRead
					/>
				</Tab>

				<Tab title="Read">
					<InboxTab
						{ ...defaultTabProps }
						getQuery={queries.getReadQuery}
						streamId="inbox-read"
					/>
				</Tab>

				<Tab title="Sent">
					<InboxTab
						{ ...defaultTabProps }
						getQuery={queries.getSentQuery}
						streamId="inbox-sent"
					/>
				</Tab>
			</Tabs>
		</InboxColumn>
	)
}

export default React.memo(Inbox, circularDeepEqual)
