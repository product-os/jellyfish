import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { withResponsiveContext } from '../../../hooks/use-responsive-context';
import { actionCreators, selectors } from '../../../core';
import { bindActionCreators } from '../../../bindactioncreators';
import Renderer, { StateProps, DispatchProps, OwnProps } from './Renderer';

const mapStateToProps = (state, ownProps): StateProps => {
	const target = ownProps.channel.data.head.id;
	const user = selectors.getCurrentUser(state);

	return {
		types: selectors.getTypes(state),
		user,
		userActiveLens: selectors.getUsersViewLens(state, target),
		userCustomFilters: selectors.getUserCustomFilters(state, target),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

const WrappedRenderer = redux.compose(
	connect<StateProps, DispatchProps, OwnProps>(
		mapStateToProps,
		mapDispatchToProps,
	),
	withResponsiveContext,
)(Renderer) as React.ComponentClass<OwnProps>;

export default WrappedRenderer;
