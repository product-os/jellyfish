import { ValidateFunction } from 'ajv';
import * as _ from 'lodash';
import { Card, Lens } from '../../Types';
import * as sdk from '../services/sdk';

// Load lenses
import ChatThreadLens from './ChatThread';

import ChatMessageCardLens from './ChatMessageCard';
import DefaultLens from './Default';
import DefaultCardLens from './DefaultCard';
import DefaultListLens from './DefaultList';
import ViewLens from './View';

class LensService {
	private validators: { [k: string]: ValidateFunction } = {};

	// Lenses are grouped into types, the first matching lens of each type is used
	private lenses = {
		list: [
			DefaultListLens,
		],
		table: [],
		card: [
			ChatMessageCardLens,
			DefaultCardLens,
		],
		single: [
			ChatThreadLens,
			ViewLens,
			DefaultLens,
		],
	};

	// Returns a validator function for a given lens, validators are cached for
	// better performance.
	public getValidator(lens: any) {
		if (!this.validators[lens.slug]) {
			if (lens.data.filter) {
				this.validators[lens.slug] = sdk.compileSchema(lens.data.filter);
			} else {
				const typeCard = sdk.getTypeCard(lens.data.type);
				this.validators[lens.slug] = sdk.compileSchema(typeCard!.data.schema);
			}
		}

		return this.validators[lens.slug];
	}

	public applyLensPreference(lenses: Lens[], preference: string[]) {
		const preferredLenses = preference.reduce((carry, slug) => {
			if (slug === '*') {
				return carry.concat(lenses);
			}
			const index = _.findIndex(lenses, { slug });
			if (index > -1) {
				return carry.concat(lenses.splice(index, 1));
			}

			return carry;
		}, [] as Lens[]);

		return preferredLenses;
	}

	// Returns an array of lenses that can be used to render `data`.
	// An optional array of lens slugs can be passed, to specify the order and
	// restrict the lenses returned. An asterisk can be used to specify
	// a wildcard, allowing any lens to be returned.
	public getLenses(data: Card | Card[] | void, preference?: string[]) {
		if (!data) {
			return [];
		}

		const lenses = _.reduce(this.lenses, (carry, items) => {
			const result = _.find(items, (lens) => this.getValidator(lens)(data));
			return result ? carry.concat(result) : carry;
		}, [] as Lens[]);

		if (preference) {
			return this.applyLensPreference(lenses, preference);
		}

		return lenses;
	}

	// Returns an array of lenses that can be used to render `data`.
	// An optional array of lens slugs can be passed, to specify the order and
	// restrict the lenses returned. An asterisk can be used to specify
	// a wildcard, allowing any lens to be returned.
	public getLensesByType(type: string | null, preference?: string[]) {
		if (!type) {
			return [];
		}

		const lenses = _.reduce(this.lenses, (carry, items) => {
			const result = _.find(items, (lens) => lens.data.type === type);
			return result ? carry.concat(result) : carry;
		}, [] as Lens[]);

		if (preference) {
			return this.applyLensPreference(lenses, preference);
		}

		return lenses;
	}
}

export default new LensService();
