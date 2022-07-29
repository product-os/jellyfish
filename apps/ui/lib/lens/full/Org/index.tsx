import _ from 'lodash';
import { createLazyComponent } from '../../../components/SafeLazy';

export const Org = createLazyComponent(
	() => import(/* webpackChunkName: "lens-org" */ './Org'),
);

const lens = {
	slug: 'lens-org',
	type: 'lens',
	version: '1.0.0',
	name: 'org lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: Org,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'org@1.0.0',
				},
			},
		},
	},
};

export default lens;
