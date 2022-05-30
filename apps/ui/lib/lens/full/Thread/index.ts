import { connect } from 'react-redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { selectors } from '../../../store';

export const Thread = createLazyComponent(
	() => import(/* webpackChunkName: "lens-thread" */ './Thread'),
);

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes()(state),
	};
};

const lens = {
	slug: 'lens-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		icon: 'address-card',
		format: 'full',
		renderer: connect(mapStateToProps)(Thread),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'thread@1.0.0',
				},
			},
		},
	},
};

export default lens;
