import _ from 'lodash';
import { createLazyComponent } from '../../../components/SafeLazy';

export const Improvement = createLazyComponent(
	() => import(/* webpackChunkName: "lens-check-run" */ './Improvement'),
);

const lens = {
	slug: 'lens-full-improvement',
	type: 'lens',
	version: '1.0.0',
	name: 'Improvement lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: Improvement,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					pattern: '^improvement@',
				},
			},
		},
	},
};

export default lens;
