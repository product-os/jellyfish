import _ from 'lodash';
import { createLazyComponent } from '../../../components/SafeLazy';
import { SLUG } from './TransformerWorker';

export const TransformerWorker = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "lens-transformer-worker" */ './TransformerWorker'
		),
);

const lens = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Transformer Worker lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: TransformerWorker,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'transformer-worker@1.0.0',
				},
			},
		},
	},
};

export default lens;
