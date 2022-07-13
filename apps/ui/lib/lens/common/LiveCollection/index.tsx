import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { withResponsiveContext } from '../../../hooks/use-responsive-context';
import { actionCreators, selectors } from '../../../store';
import { bindActionCreators } from '../../../bindactioncreators';
import Renderer, { StateProps, DispatchProps, OwnProps } from './Renderer';

const mapStateToProps = (state, ownProps): StateProps => {
	const target = ownProps.card.id;
	const user = selectors.getCurrentUser()(state);

	return {
		types: selectors.getTypes()(state),
		relationships: selectors.getRelationships()(state),
		user,
		userActiveLens: selectors.getUsersViewLens(target)(state),
		userCustomFilters: selectors.getUserCustomFilters(target)(state),
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
