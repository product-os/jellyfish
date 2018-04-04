import { ValidateFunction } from 'ajv';
import * as _ from 'lodash';
import { Card, Lens } from '../../Types';
import * as sdk from '../services/sdk';

// Load lenses
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
			DefaultCardLens,
		],
		single: [
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

	// Returns an array of lenses that can be used to render `data`.
	public getLenses(data: Card | Card[] | void) {
		if (!data) {
			return [];
		}

		const lenses = _.reduce(this.lenses, (carry, items) => {
			const result = _.find(items, (lens) => this.getValidator(lens)(data));
			return result ? carry.concat(result) : carry;
		}, [] as Lens[]);

		return lenses;
	}
}

export default new LensService();
