/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import { circularDeepEqual } from 'fast-equals';
import { v4 as uuid } from 'uuid';
import type { JSONSchema } from '@balena/jellyfish-types';
import { useSetup } from '@balena/jellyfish-ui-components';
import { useTask } from '@balena/jellyfish-chat-widget/build/hooks';
import { TaskButton } from '@balena/jellyfish-chat-widget/build/components/task-button';

const getSubscriptionQuery = (view): JSONSchema => {
	return {
		type: 'object',
		properties: {
			type: {
				const: 'subscription@1.0.0',
			},
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					type: {
						const: 'view@1.0.0',
					},
					id: {
						const: view.id,
					},
				},
				required: ['type', 'id'],
			},
		},
	};
};

const subscribe = async (sdk, view) => {
	const subscription = await sdk.card.create({
		type: 'subscription',
		version: '1.0.0',
		data: {},
	});

	await sdk.card.link(view, subscription, 'has attached');
	return subscription;
};

const unsubscribe = async (sdk, view, subscription) => {
	await sdk.card.unlink(view, subscription, 'has attached');
	await sdk.card.remove(subscription.id, subscription.type);
};

export const SubscribeButton = React.memo<any>(({ view }) => {
	const { sdk } = useSetup()!;
	const [subscription, setSubscription] = React.useState(null);
	const subscribeTask = useTask(subscribe, [sdk, view]);
	const unsubscribeTask = useTask(unsubscribe, [sdk, view, subscription]);

	React.useEffect(() => {
		let stream: any = null;

		(async () => {
			const query = getSubscriptionQuery(view);
			stream = await sdk.stream(query);

			stream.on('dataset', ({ data: { cards } }) => {
				setSubscription(cards[0]);
			});

			stream.on('update', ({ data: { after: card } }) => {
				setSubscription(card);
			});

			stream.emit('queryDataset', {
				id: uuid(),
				data: {
					schema: query,
					options: {
						limit: 1,
					},
				},
			});
		})();

		return () => {
			if (stream) {
				stream.close();
			}
		};
	}, [sdk, view]);

	return subscription ? (
		<TaskButton task={unsubscribeTask}>Unsubscribe</TaskButton>
	) : (
		<TaskButton task={subscribeTask}>Subscribe</TaskButton>
	);
}, circularDeepEqual);
