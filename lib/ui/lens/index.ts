import * as _ from 'lodash';
import * as skhema from 'skhema';
import { Card, Lens } from '../../Types';

// Load lenses
import InterleavedLens from './Interleaved';
import KanbanLens from './Kanban';
import ListLens from './List';
import SingleCardLens from './SingleCard';
import TimelineLens from './Timeline';
import TodoList from './TodoList';
import ViewLens from './View';

class LensService {
	private lenses = [
		InterleavedLens,
		KanbanLens,
		ListLens,
		SingleCardLens,
		TimelineLens,
		TodoList,
		ViewLens,
	];

	// Returns an array of lenses that can be used to render `data`.
	// An optional array of lens slugs can be passed, to specify the order and
	// restrict the lenses returned. An asterisk can be used to specify
	// a wildcard, allowing any lens to be returned.
	public getLenses(data: Card | Card[] | void): Lens[] {
		if (!data) {
			return [];
		}

		const scoredLenses = _.map(this.lenses, (lens) => {
			return {
				lens,
				match: skhema.match(lens.data.filter, data),
			};
		})
			.filter((result) => result.match.valid);

		const sorted = _.reverse(_.sortBy(scoredLenses, 'match.score'));

		return _.map(sorted, 'lens');
	}

	public getLens(data: Card | Card[]): Lens {
		return _.first(this.getLenses(data))!;
	}

	public getLensBySlug(slug: string): Lens | null {
		return _.find(this.lenses, { slug }) || null;
	}
}

export default new LensService();
