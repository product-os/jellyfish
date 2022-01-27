import * as _ from 'lodash';
import Renderer from '../../common/ContractRenderer';

export default {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: Renderer,
		filter: {
			type: 'object',
		},
	},
};
