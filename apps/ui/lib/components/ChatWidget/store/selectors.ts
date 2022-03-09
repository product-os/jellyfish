import filter from 'lodash/filter';
import orderBy from 'lodash/orderBy';
import get from 'lodash/get';
import every from 'lodash/every';
import type { JsonSchema } from '@balena/jellyfish-types';
import type {
	Contract,
	UserContract,
} from '@balena/jellyfish-types/build/core';

export const selectThreadListQuery = () => {
	return (state): JsonSchema => {
		return {
			$$links: {
				'has attached element': {
					type: 'object',
					additionalProperties: true,
					properties: {
						type: {
							enum: ['message@1.0.0', 'create@1.0.0'],
						},
					},
				},
			},
			properties: {
				links: {
					type: 'object',
					additionalProperties: true,
				},
				type: {
					const: 'support-thread@1.0.0',
				},
				active: {
					const: true,
				},
				data: {
					properties: {
						product: {
							const: state.product,
						},
					},
					required: ['product'],
				},
			},
			additionalProperties: true,
		};
	};
};

export const selectProduct = () => {
	return (state) => {
		return state.product;
	};
};

export const selectCardsByType = (type) => {
	return (state) => {
		return filter(state.cards, (card) => {
			return card.type.split('@')[0] === type;
		});
	};
};

export const selectCardById = <TContract extends Contract>(id: string) => {
	return (state): TContract | null => {
		return state.cards[id] || null;
	};
};

export const selectGroups = () => {
	return (state) => {
		return {
			groups: state.groups || [],
		};
	};
};

export const selectThreads = () => {
	return (state) => {
		const threads = selectCardsByType('support-thread')(state);
		return orderBy(
			threads,
			(thread) => {
				const messages = selectMessages(thread.id)(state);
				return messages.length ? messages[0].data.timestamp : thread.created_at;
			},
			'desc',
		);
	};
};

export const selectCurrentUser = () => {
	return (state): UserContract | null => {
		return selectCardById<UserContract>(state.currentUser)(state);
	};
};

export const selectMessages = (threadId) => {
	return (state) => {
		const messages = selectCardsByType('message')(state);
		return orderBy(
			filter(messages, ['data.target', threadId]),
			'data.timestamp',
			'asc',
		);
	};
};

export const selectNotifications = () => {
	return selectCardsByType('notification');
};

export const selectNotificationsByThread = (threadId: string) => {
	return (state) => {
		return selectNotifications()(state).filter((notification) => {
			return (
				get(notification, [
					'links',
					'is attached to',
					0,
					'links',
					'is attached to',
					0,
					'id',
				]) === threadId
			);
		});
	};
};

export const areEqualArrayOfContracts = (
	leftContracts: Contract[],
	rightContracts: Contract[],
) => {
	return (
		leftContracts.length === rightContracts.length &&
		every(leftContracts, (left, index) => {
			return left.id === rightContracts[index].id;
		})
	);
};
