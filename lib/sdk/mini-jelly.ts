import AJV = require('ajv');
import ajvKeywords = require('ajv-keywords');
import metaSchema6 = require('ajv/lib/refs/json-schema-draft-06.json');
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs';
import uuid = require('uuid/v4');
import { Card } from '../Types';

interface Database {
	lastChange: {
		before: Card | null;
		after: Card | null;
	};
	data: {
		[id: string]: Card;
	};
}

type WatchCallback = (lastChange: Database['lastChange']) => void;

export class MiniJelly {
	private ajv: AJV.Ajv;
	public db: BehaviorSubject<Database>;

	constructor() {
		this.ajv = new AJV({
			allErrors: true,
		});
		this.ajv.addMetaSchema(metaSchema6);
		ajvKeywords(this.ajv, [
			'formatMaximum',
			'formatMinimum',
		]);

		this.db = new BehaviorSubject({
			lastChange: {
				before: null,
				after: null,
			},
			data: {},
		});
	}

	public replaceCard(updatedCard: Card) {
		const { data } = this.db.value;
		const card = data[updatedCard.id];

		if (!_.isEqual(card, updatedCard)) {
			data[card.id] = updatedCard;
			this.db.next({
				lastChange: {
					before: card,
					after: updatedCard,
				},
				data,
			});
		}
	}

	public remove(id: string) {
		const { data } = this.db.value;
		if (data[id]) {
			delete data[id];
			this.db.next({
				lastChange: {
					before: null,
					after: null,
				},
				data,
			});
		}
	}

	public watch(schema: JSONSchema6, callback: WatchCallback) {
		const ajv = new AJV({
			allErrors: true,
		});
		ajv.addMetaSchema(metaSchema6);
		ajvKeywords(ajv, [
			'formatMaximum',
			'formatMinimum',
		]);

		const validator = ajv.compile(schema);

		const subscription = this.db.subscribe((db) => {
			const element = db.lastChange.after;

			if (!element) {
				return;
			}

			if (validator(element)) {
				callback(db.lastChange);
			}
		});

		return subscription.unsubscribe.bind(subscription);
	}

	public getById(id: string): Card | null {
		return this.db.value.data[id] || null;
	}

	public insert(card: Card) {
		if (!card.id) {
			card.id = uuid();
		}

		const db = this.db.value;
		if (db.data[card.id]) {
			throw new Error(`Card with id already exists: ${card.id}`);
		}
		db.data[card.id] = card;
		db.lastChange = {
			before: null,
			after: card,
		};
		this.db.next(db);

		return card.id;
	}

	public update(id: string, update: Partial<Card>) {
		const card = this.db.value.data[id];
		const updatedCard = _.mergeWith({}, card, update, (objectValue, sourceValue) => {
			if (_.isArray(objectValue)) {
				return sourceValue;
			}
		});

		this.replaceCard(updatedCard);
	}

	public batchInsert(cards: Card[]) {
		const db = this.db.value;
		cards.forEach((card) => {
			db.data[card.id] = card;
		});

		db.lastChange = {
			before: null,
			after: null,
		};
	}

	public upsert(update: Card) {
		const card = this.db.value.data[update.id];

		if (!card) {
			return this.insert(update);
		}

		const updatedCard = _.mergeWith({}, card, update, (objectValue, sourceValue) => {
			if (_.isArray(objectValue)) {
				return sourceValue;
			}
		});

		this.replaceCard(updatedCard);
	}

	public query(schema: JSONSchema6) {
		this.ajv.removeSchema(/^.*$/);
		const validator = this.ajv.compile(schema);

		const result = _.filter(this.db.value.data, (element) => !!validator(element));

		return result;
	}
}
