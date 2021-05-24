/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { circularDeepEqual } from 'fast-equals';
import styled from 'styled-components';
import React, { useState } from 'react';
import { Flex, Heading, Tabs, Tab } from 'rendition';
import { CloseButton, Column } from '@balena/jellyfish-ui-components';
import InboxTab from './InboxTab';
import * as queries from './queries';

const InboxColumn = styled(Column)`
	[role='tabpanel'] {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
`;

const Inbox = ({ channel, setupStream, clearViewData, paginateStream }) => {
	// State controller for managing the active tab
	const [currentTab, setCurrentTab] = useState(0);

	const defaultTabProps = {
		setupStream,
		clearViewData,
		paginateStream,
		currentTab,
		key: currentTab,
	};

	return (
		<InboxColumn>
			<Flex p={3} justifyContent="space-between">
				<Heading.h4>Inbox</Heading.h4>
				<CloseButton flex={0} mt={-1} channel={channel} />
			</Flex>

			<Tabs activeIndex={currentTab} onActive={setCurrentTab}>
				<Tab title="Unread">
					<InboxTab
						{...defaultTabProps}
						getQuery={queries.getUnreadQuery}
						canMarkAsRead
					/>
				</Tab>

				<Tab title="Read">
					<InboxTab {...defaultTabProps} getQuery={queries.getReadQuery} />
				</Tab>

				<Tab title="Sent">
					<InboxTab {...defaultTabProps} getQuery={queries.getSentQuery} />
				</Tab>
			</Tabs>
		</InboxColumn>
	);
};

export default React.memo(Inbox, circularDeepEqual);
