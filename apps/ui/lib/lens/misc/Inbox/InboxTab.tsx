import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import { SdkQueryOptions } from '@balena/jellyfish-client-sdk/build/types';
import React, { useState } from 'react';
import { Flex, Box } from 'rendition';
import { Icon } from '../../../components';
import { JsonSchema } from 'autumndb';
import { useCursorEffect } from '../../../hooks';
import { GroupedVirtuoso } from 'react-virtuoso';
import { ChannelContract } from '../../../types';
import { EventBox } from './EventBox';

const DEFAULT_OPTIONS: SdkQueryOptions = {
	limit: 25,
	sortBy: 'created_at',
	sortDir: 'desc',
};

interface Props {
	channel: ChannelContract;
	query: JsonSchema;
	canArchive?: boolean;
}

const Inbox = ({ channel, query, canArchive }: Props) => {
	const [inboxItems, nextPage, hasNextPage, loading] = useCursorEffect(
		query,
		DEFAULT_OPTIONS,
	);

	const [isLoadingPage, setIsLoadingPage] = useState(false);

	const loadMoreContracts = async () => {
		if (!isLoadingPage && hasNextPage()) {
			setIsLoadingPage(true);
			await nextPage();
			setIsLoadingPage(false);
		}
	};

	// An oddity of react-virtuoso is that the `itemContent` cannot be a memoized component, but it can call out to a memoized component.
	// See https://virtuoso.dev/#performance
	const itemContent = (_index, contract) => {
		return (
			<EventBox
				key={contract.id}
				contract={contract}
				channel={channel}
				canArchive={canArchive}
			/>
		);
	};

	return (
		<Flex
			flexDirection="column"
			style={{
				maxWidth: '100%',
				flex: 1,
			}}
		>
			<Box
				flex={1}
				style={{
					minHeight: 0,
				}}
			>
				{loading && !inboxItems.length ? (
					<Box p={2}>
						<Icon name="cog" spin />
					</Box>
				) : (
					<GroupedVirtuoso
						data={inboxItems}
						endReached={loadMoreContracts}
						itemContent={itemContent}
						overscan={10}
					/>
				)}
			</Box>
		</Flex>
	);
};

export default React.memo(Inbox, circularDeepEqual);
