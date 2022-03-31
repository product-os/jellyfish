import _ from 'lodash';
import { createLazyComponent } from '../../../components/SafeLazy';

export const Loop = createLazyComponent(
	() => import(/* webpackChunkName: "lens-check-run" */ './Loop'),
);

const lens = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: Loop,
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'loop@1.0.0',
				},
			},
		},
	},
};

export default lens;
