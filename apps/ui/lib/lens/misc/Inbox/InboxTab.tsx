import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import { SdkQueryOptions } from '@balena/jellyfish-client-sdk/build/types';
import React, { useState } from 'react';
import { Flex, Box } from 'rendition';
import { Icon, useSetup } from '../../../components';
import { JsonSchema } from 'autumndb';
import { useCursorEffect } from '../../../hooks';
import { GroupedVirtuoso } from 'react-virtuoso';
import { ChannelContract } from '../../../types';
import { EventBox } from './EventBox';

const getArchivedNotificationQuery = (): JsonSchema => ({
	type: 'object',
	properties: {
		type: {
			const: 'notification@1.0.0',
		},
		data: {
			type: 'object',
			required: ['status'],
			properties: {
				status: {
					const: 'archived',
				},
			},
		},
	},
});

const DEFAULT_OPTIONS: SdkQueryOptions = {
	limit: 15,
	sortBy: 'created_at',
	sortDir: 'desc',
};

interface Props {
	channel: ChannelContract;
	query: JsonSchema;
	canArchive?: boolean;
}

const Inbox = ({ channel, query, canArchive }: Props) => {
	const { sdk } = useSetup()!;
	const [threads, nextPage, hasNextPage, loading] = useCursorEffect(
		query,
		DEFAULT_OPTIONS,
	);

	// This is a hack that will store a list of notification ids that have been archived
	// whilst this component is alive. This is to prevent the notification from being shown
	// even though it has been archived.
	// We have to do this because the current streaming logic will not unmatch the messages
	// if the notification contract changes.
	// TODO: Fix this at the autumndb level and remove this code.
	const [archivedNotifications, setArchivedNotifications] = useState<string[]>(
		[],
	);
	React.useEffect(() => {
		const stream = sdk.stream(getArchivedNotificationQuery());
		stream.on('update', ({ data }) => {
			if (data.after) {
				setArchivedNotifications(archivedNotifications.concat(data.id));
			}
		});
		return () => {
			stream.close();
		};
	}, [archivedNotifications]);

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
			<EventBox contract={contract} channel={channel} canArchive={canArchive} />
		);
	};

	const inboxItems = threads.filter((thread) => {
		const nIds = _.map(
			thread?.links?.['has attached element']?.[0]?.links?.['has attached'] ??
				[],
			'id',
		);
		return !nIds.length || !_.intersection(archivedNotifications, nIds).length;
	});

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
