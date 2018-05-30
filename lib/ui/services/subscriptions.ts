import * as _ from 'lodash';
import { JellyfishStream } from '../../sdk/stream';
import { Card } from '../../Types';
import { actionCreators, sdk, store } from '../app';
import { createNotification } from './notifications';

export class SubscriptionManager {
	private streams: { [k: string]: JellyfishStream } = {};

	public findMentions(data: Card): string[] {
		return _.get(data, 'data.mentionsUser') || _.get(data, 'data.payload.mentionsUser', []);
	}

	public subscribe(card: Card) {
		const stream = sdk.stream(card.id);
		const user = _.get(store.getState(), 'session.user');

		if (this.streams[card.id]) {
			this.streams[card.id].destroy();
		}

		this.streams[card.id] = stream;

		stream.on('update', (response) => {
			let mentions: string[] = [];

			const content = response.data.after;

			// If before is non-null then a card has been updated and we need to do
			// some checking to make sure the user doesn't get spammed every time
			// a card is updated. We only check new items added to the mentions array
			if (response.data.before) {
				const beforeMentions = this.findMentions(response.data.before);
				const afterMentions = this.findMentions(response.data.after);
				mentions = _.difference(afterMentions, beforeMentions);
			} else {
				mentions = this.findMentions(content);
			}

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
