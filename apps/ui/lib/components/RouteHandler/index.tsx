import _ from 'lodash';
import { connect } from 'react-redux';
import { compose, bindActionCreators } from 'redux';
import { withResponsiveContext } from '@balena/jellyfish-ui-components';
import { actionCreators, selectors } from '../../core';
import RouteHandler from './RouteHandler';

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state),
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state),
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['setChannels', 'queryAPI', 'createLink']),
			dispatch,
		),
	};
};

export default compose(
	connect(mapStateToProps, mapDispatchToProps),
	withResponsiveContext,
)(RouteHandler);
