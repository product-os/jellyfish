import _ from 'lodash';
import { createLazyComponent } from '../../../components/SafeLazy';

export const SingleCard = createLazyComponent(() => import('./SingleCard'));

const lens = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: SingleCard,
		filter: {
			type: 'object',
		},
	},
};

export default lens;
