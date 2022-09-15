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
