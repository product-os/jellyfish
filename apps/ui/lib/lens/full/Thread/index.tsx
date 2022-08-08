import { createLazyComponent } from '../../../components/SafeLazy';

export const ThreadLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-thread" */ './Thread'),
);

const lens = {
	slug: 'lens-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: ThreadLens,
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'thread@1.0.0',
				},
			},
		},
	},
};

export default lens;
