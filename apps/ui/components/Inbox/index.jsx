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
import {
	connect
} from 'react-redux'
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
	bindActionCreators
} from 'redux'
import Column from '@balena/jellyfish-ui-components/lib/shame/Column'
import {
	actionCreators
} from '../../core'
import InboxTab from './InboxTab'
import * as queries from './queries'

const InboxColumn = styled(Column) `
	[role="tabpanel"] {
		display: flex;
	  flex-direction: column;
	  height: 100vh;
	}
`

const Inbox = React.memo(({
	setupStream,
	paginateStream
}) => {
	// State controller for managing the active tab
	const [ currentTab, setCurrentTab ] = useState(0)

	const defaultTabProps = {
		setupStream,
		paginateStream,
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
						canMarkAsRead
					/>
				</Tab>

				<Tab title="Read">
					<InboxTab
						{ ...defaultTabProps }
						getQuery={queries.getReadQuery}
					/>
				</Tab>

				<Tab title="Sent">
					<InboxTab
						{ ...defaultTabProps }
						getQuery={queries.getSentQuery}
					/>
				</Tab>
			</Tabs>
		</InboxColumn>
	)
}, circularDeepEqual)

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators(
		_.pick(actionCreators, [
			'setupStream',
			'paginateStream'
		]),
		dispatch
	)
}

export default connect(null, mapDispatchToProps)(Inbox)
