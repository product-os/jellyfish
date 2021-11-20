import '../../test/ui-setup';
import _ from 'lodash';
import { getLenses, getLensForTarget } from './index';

const user = {
	id: 'u-1',
	slug: 'user-1',
};

const data = [
	{
		id: 'st-1',
		slug: 'support-thread-1',
		type: 'support-thread@1.0.0',
		data: {
			status: 'open',
		},
	},
];

describe('getLenses', () => {
	test('can be used to return one lens per icon', () => {
		let lenses = getLenses('list', data, user);
		expect(
			lenses.filter((lens) => lens.data.icon === 'address-card').length > 1,
		).toBe(true);
		lenses = getLenses('list', data, user, 'data.icon');
		expect(
			lenses.filter((lens) => lens.data.icon === 'address-card').length,
		).toBe(1);
	});

	test('returns the support-threads, chart and kanban lenses for support thread data', () => {
		const lensSlugs = _.map(getLenses('list', data, user, 'data.icon'), 'slug');
		expect(lensSlugs.includes('lens-support-threads')).toBe(true);
		expect(lensSlugs.includes('lens-chart')).toBe(true);
		expect(lensSlugs.includes('lens-kanban')).toBe(true);
	});
});

describe('getLensForTarget', () => {
	test("returns the omni-search lens for the path 'search'", () => {
		const lens = getLensForTarget('search');
		expect(lens.slug).toBe('lens-omni-search');
	});

	test("returns the inbox lens for the path 'inbox'", () => {
		const lens = getLensForTarget('inbox');
		expect(lens.slug).toBe('lens-inbox');
	});
});
