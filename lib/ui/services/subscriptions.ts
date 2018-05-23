import * as _ from 'lodash';
import { JellyfishStream } from '../../sdk/stream';
import { Card } from '../../Types';
import { actionCreators, sdk, store } from '../app';
import { createNotification } from './notifications';

export class SubscriptionManager {
	private streams: { [k: string]: JellyfishStream } = {};

	public subscribe(card: Card) {
		const stream = sdk.stream(card.id);
		const user = _.get(store.getState(), 'session.user');

		if (this.streams[card.id]) {
			this.streams[card.id].destroy();
		}

		this.streams[card.id] = stream;

		stream.on('update', (response) => {
			// If before is non-null then a card has been updated and we're not
			// interested
			if (response.data.before) {
				return;
			}

			const content = response.data.after;

			const mentions = _.get(content, 'data.mentionsUser');

			if (mentions && _.includes(mentions, user.id)) {
				this.notify(card, content, user, 'mention');
				store.dispatch(actionCreators.addViewNotice({
					id: card.id,
					newMentions: true,
				}));
			} else {
				this.notify(card, content, user, 'update');
				store.dispatch(actionCreators.addViewNotice({
					id: card.id,
					newContent: true,
				}));
			}
		});

		return stream;
	}

	public async notify(view: Card, content: Card, user: Card, notifyType: 'mention' | 'update' | 'alert') {
		const subscription = await this.getSubscription(view, user);
		const settings = _.get(subscription, ['data', 'notificationSettings', 'web' ]);

		if (!settings) {
			return;
		}

		if (!settings[notifyType]) {
			// If the notify type isn't 'update' and the user allows 'update'
			// notifications, we should notify, since a mention and an alert are
			// technically updates
			if (notifyType === 'update' || !settings.update) {
				return;
			}
		}

		createNotification(view.name!, _.get(content, 'data.payload.message'), view.id);
	}

	public async getSubscription(card: Card, user: Card) {
		const results = await sdk.query({
			type: 'object',
			properties: {
				type: {
					const: 'subscription',
				},
				data: {
					type: 'object',
					properties: {
						target: {
							const: card.id,
						},
						actor: {
							const: user.id,
						},
					},
					additionalProperties: true,
				},
			},
			additionalProperties: true,
		});

		let subCard = _.first(results) || null;

		if (!subCard) {
			try {
				const subCardId = await sdk.card.create({
					type: 'subscription',
					data: {
						target: card.id,
						actor: user.id,
					},
				});

				subCard = await sdk.card.get(subCardId);
			} catch(error) {
				store.dispatch(actionCreators.addNotification('danger', error.message));

				return;
			}
		}

		return subCard;
	}
}
