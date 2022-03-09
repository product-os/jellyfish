import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuid } from 'uuid';
import type { JsonSchema } from '@balena/jellyfish-types';
import { useSetup } from '@balena/jellyfish-ui-components';
import { SET_CARDS, DELETE_CARD } from '../store/action-types';
import {
	areEqualArrayOfContracts,
	selectCurrentUser,
	selectNotifications,
	selectProduct,
} from '../store/selectors';

export const useNotificationWatcher = ({ onNotificationsChange }) => {
	const { sdk } = useSetup()!;
	const dispatch = useDispatch();
	const product = useSelector(selectProduct());
	const currentUser = useSelector(selectCurrentUser());
	const notifications = useSelector(
		selectNotifications(),
		areEqualArrayOfContracts,
	);

	React.useEffect(() => {
		if (!currentUser) {
			return;
		}

		const query: JsonSchema = {
			type: 'object',
			required: ['type'],
			properties: {
				type: {
					const: 'notification@1.0.0',
				},
			},
			$$links: {
				'is attached to': {
					type: 'object',
					required: ['type'],
					properties: {
						type: {
							const: 'message@1.0.0',
						},
					},
					$$links: {
						'is attached to': {
							required: ['type', 'data'],
							properties: {
								type: {
									const: 'support-thread@1.0.0',
								},
								data: {
									type: 'object',
									required: ['product'],
									properties: {
										product: {
											const: product,
										},
									},
								},
							},
						},
					},
				},
			},
			not: {
				$$links: {
					'is read by': {
						type: 'object',
						required: ['type', 'id'],
						properties: {
							type: {
								const: 'user@1.0.0',
							},
							id: {
								const: currentUser.id,
							},
						},
					},
				},
			},
		};

		const stream = sdk.stream(query);

		stream.emit('queryDataset', {
			data: {
				id: uuid(),
				schema: query,
			},
		});

		stream.on('dataset', ({ data: { cards } }) => {
			dispatch({
				type: SET_CARDS,
				payload: cards,
			});
		});

		stream.on('update', ({ data, error }) => {
			if (error) {
				console.error(error);
				return;
			}

			if (data.after) {
				dispatch({
					type: SET_CARDS,
					payload: [data.after],
				});
			} else {
				dispatch({
					type: DELETE_CARD,
					payload: data.id,
				});
			}
		});

		return () => {
			stream.close();
		};
	}, [sdk, currentUser?.id, product]);

	React.useEffect(() => {
		if (onNotificationsChange) {
			onNotificationsChange(notifications);
		}
	}, [notifications]);
};
