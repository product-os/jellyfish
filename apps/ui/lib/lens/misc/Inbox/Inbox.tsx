import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Tab, Tabs } from 'rendition';
import { Column } from '../../../components';
import { JsonSchema, UserContract } from 'autumndb';
import { useSelector } from 'react-redux';
import InboxTab from './InboxTab';
import { selectors } from '../../../store';
import { ChannelContract } from '../../../types';

const getOpenQuery = (): JsonSchema => {
	return {
		type: 'object',
		properties: {
			type: {
				enum: ['message@1.0.0', 'whisper@1.0.0'],
			},
		},
		$$links: {
			'has attached': {
				type: 'object',
				properties: {
					type: {
						const: 'notification@1.0.0',
					},
					data: {
						type: 'object',
						properties: {
							status: {
								const: 'open',
							},
						},
					},
				},
			},
			'is attached to': {
				type: 'object',
				anyOf: [
					{
						$$links: {
							'is of': {
								type: 'object',
							},
						},
					},
					true,
				],
			},
		},
	};
};

const getDirectQuery = (user: UserContract): JsonSchema => {
	// Get any messages from 1 to 1 conversations
	const dmsQuery: any = getOpenQuery();
	dmsQuery.$$links['is attached to'] = {
		type: 'object',
		properties: {
			type: {
				const: 'thread@1.0.0',
			},
			data: {
				type: 'object',
				required: ['dms'],
				properties: {
					dms: {
						const: true,
					},
				},
			},
		},
	};

	// Get any messages that directly mention/alert the user
	const directQuery: any = getOpenQuery();
	directQuery.properties.data = {
		type: 'object',
		properties: {
			payload: {
				anyOf: [
					{
						type: 'object',
						properties: {
							message: {
								pattern: `@${user.slug.replace(/^user-/, '')}`,
							},
							mentionsUser: {
								type: 'array',
								contains: {
									const: user.slug,
								},
							},
						},
					},
					{
						type: 'object',
						properties: {
							message: {
								pattern: `!${user.slug.replace(/^user-/, '')}`,
							},
							alertsUser: {
								type: 'array',
								contains: {
									const: user.slug,
								},
							},
						},
					},
				],
			},
		},
	};

	return {
		anyOf: [dmsQuery, directQuery],
	};
};

const getArchivedQuery = (): JsonSchema => {
	const query: any = getOpenQuery();
	query.$$links['has attached'].properties.data.properties.status.const =
		'archived';
	query.$$links['has attached'].properties.data.required = ['status'];

	return query;
};

const getSentQuery = (user: UserContract): JsonSchema => {
	return {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: ['message@1.0.0', 'whisper@1.0.0'],
			},
			data: {
				type: 'object',
				required: ['actor'],
				properties: {
					actor: {
						type: 'string',
						const: user.id,
					},
				},
			},
		},
		$$links: {
			'is attached to': {
				type: 'object',
				anyOf: [
					{
						$$links: {
							'is of': {
								type: 'object',
							},
						},
					},
					true,
				],
			},
		},
	};
};

interface Props {
	channel: ChannelContract;
}

const Inbox = ({ channel }: Props) => {
	const user = useSelector(selectors.getCurrentUser());
	if (!user) {
		throw new Error('User not found');
	}
	const openQuery = React.useMemo(() => {
		return getOpenQuery();
	}, []);

	const directQuery = React.useMemo(() => {
		return getDirectQuery(user);
	}, []);

	const archivedQuery = React.useMemo(() => {
		return getArchivedQuery();
	}, []);

	const sentQuery = React.useMemo(() => {
		return getSentQuery(user);
	}, []);

	return (
		<Column pt={2}>
			<Tabs>
				<Tab title="Open">
					<InboxTab query={openQuery} channel={channel} canArchive={true} />
				</Tab>
				<Tab data-test="inbox-direct-mentions-tab" title="Direct Mentions">
					<InboxTab query={directQuery} channel={channel} canArchive={true} />
				</Tab>
				<Tab title="Archived">
					<InboxTab query={archivedQuery} channel={channel} />
				</Tab>
				<Tab title="Sent">
					<InboxTab query={sentQuery} channel={channel} />
				</Tab>
			</Tabs>
		</Column>
	);
};

export default React.memo(Inbox, circularDeepEqual);
