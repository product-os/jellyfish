import * as _ from 'lodash';
import { Card } from '../../Types';
import { createNotification } from './notifications';
import * as sdk from './sdk';
import store, { actionCreators } from './store';

export class SubscriptionManager {
	private subsMap: { [k: string]: Card } = {};
	private streams: { [k: string]: sdk.db.JellyfishStream } = {};
	private allSubsStream: sdk.db.JellyfishStream;

	public async updateSubscriptions(cards: Card[]) {
		const user = _.get(store.getState(), 'session.user');

		const subscriptions = [];

		for (const card of cards) {
			const sub = await this.getSubscription(card, user);
			subscriptions.push(sub);
		}

		this.streamAllSubscriptions(user);

		_.forEach(this.streams, (stream) => stream.destroy());

		_.forEach(cards, (card) => {
			const stream = sdk.db.stream(card.id);

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
					this.notify(card, content, 'mention');
					store.dispatch(actionCreators.addViewNotice({
						id: card.id,
						newMentions: true,
					}));
				} else {
					this.notify(card, content, 'update');
					store.dispatch(actionCreators.addViewNotice({
						id: card.id,
						newContent: true,
					}));
				}
			});
		});
	}

	public notify(view: Card, content: Card, notifyType: 'mention' | 'update' | 'alert') {
		const settings = _.get(this.subsMap[view.id], ['data', 'notificationSettings', 'web' ]);

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
		if (this.subsMap[card.id]) {
			return this.subsMap[card.id];
		}
		const results = await sdk.db.query({
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
		})

		let subCard = _.first(results) || null;

		if (!subCard) {
			const actionResponse = await sdk.card.add({
				type: 'subscription',
				data: {
					target: card.id,
					actor: user.id
				},
			})

			subCard = await sdk.card.get(actionResponse.results.data)
		}

		this.subsMap[card.id] = subCard!


		return subCard;
	}

	// Make sure subscription data is up to date
	public streamAllSubscriptions(user: Card) {
		if (this.allSubsStream) {
			this.allSubsStream.destroy();
		}
		this.allSubsStream = sdk.db.stream({
			type: 'object',
			properties: {
				type: {
					const: 'subscription',
				},
				data: {
					type: 'object',
					properties: {
						actor: {
							const: user.id,
						},
					},
					additionalProperties: true,
				},
			},
			additionalProperties: true,
		});

		this.allSubsStream.on('update', (response) => {
			const card = response.data.before;
			if (card) {
				this.subsMap[card.data.target] = card;
			}
		});
	}
}
