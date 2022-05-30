import * as React from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuid } from 'uuid';
import { Icon, PlainButton, useSetup } from '../../../components';
import type { JsonSchema } from '@balena/jellyfish-types';
import type {
	Contract,
	ContractDefinition,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import { selectors } from '../../../store';

export const SubscribeButton = ({ card, ...rest }) => {
	const { sdk } = useSetup()!;
	const [loading, setLoading] = React.useState(true);
	const [subscription, setSubscription] = React.useState<
		Contract | ContractDefinition | null
	>(null);
	const currentUser = useSelector<any, UserContract>(
		selectors.getCurrentUser(),
	);

	React.useEffect(() => {
		let stream: any = null;

		(async () => {
			const query: JsonSchema = {
				type: 'object',
				required: ['type', 'active'],
				properties: {
					type: {
						const: 'subscription@1.0.0',
					},
					active: {
						const: true,
					},
				},
				$$links: {
					'has attached element': {
						type: 'object',
						required: ['type', 'data'],
						properties: {
							type: {
								const: 'create@1.0.0',
							},
							data: {
								type: 'object',
								required: ['actor'],
								properties: {
									actor: {
										const: currentUser.id,
									},
								},
							},
						},
					},
					'is attached to': {
						type: 'object',
						required: ['id'],
						properties: {
							id: {
								const: card.id,
							},
						},
					},
				},
			};

			stream = sdk.stream(query);
			setLoading(true);

			stream.on('dataset', ({ data: { cards } }) => {
				setLoading(false);
				setSubscription(cards[0]);
			});

			stream.on('update', ({ data: { after } }) => {
				setSubscription(after);
			});

			stream.emit('queryDataset', {
				id: uuid(),
				data: {
					schema: query,
				},
			});
		})();

		return () => {
			if (stream) {
				stream.close();
			}
		};
	}, [sdk, currentUser.id]);

	const handleClick = React.useCallback(async () => {
		try {
			if (subscription) {
				/*
				 * This happens when user clicks unsubscribe before subscription is finished.
				 * In this state, button has intermediate opacity (0.75)
				 */
				if (!subscription.id) {
					return;
				}

				setSubscription(null);
				await sdk.card.remove(subscription.id, subscription.type);
				return;
			}

			const newSubscription = {
				type: 'subscription@1.0.0',
				slug: `subscription-${uuid()}`,
				data: {},
			};

			setSubscription(newSubscription);
			const newSubscriptionResult = await sdk.card.create(newSubscription);

			setSubscription(newSubscriptionResult);
			await sdk.card.link(card, newSubscriptionResult, 'has attached');
		} catch (err) {
			setSubscription(subscription);
		}
	}, [subscription, sdk, currentUser, card]);

	if (loading) {
		return null;
	}

	return (
		<PlainButton
			tooltip={{
				placement: 'bottom',
				text: subscription ? 'Unsubscribe' : 'Subscribe',
			}}
			icon={
				<Icon
					name="star"
					style={{ opacity: subscription ? (subscription.id ? 1 : 0.75) : 0.5 }}
				/>
			}
			onClick={handleClick}
			{...rest}
		/>
	);
};
