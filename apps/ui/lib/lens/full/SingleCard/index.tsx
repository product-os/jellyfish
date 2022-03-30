import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors } from '../../../core';
import type { StateProps, DispatchProps, OwnProps } from './SingleCard';

export const SingleCard = createLazyComponent(
	() => import(/* webpackChunkName: "lens-check-run" */ './SingleCard'),
);

export { SingleCardTabs } from './SingleCard';

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

const lens = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect<StateProps, DispatchProps, OwnProps>(
			mapStateToProps,
			mapDispatchToProps,
		)(SingleCard),
		filter: {
			type: 'object',
		},
	},
};

export default lens;
