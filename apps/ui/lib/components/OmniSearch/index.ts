import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { actionCreators, selectors } from '../../core';
import { OmniSearch } from './OmniSearch';

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels(state),
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, ['addChannel', 'updateChannel']),
			dispatch,
		),
	};
};

export default redux.compose<any>(
	withRouter,
	connect(mapStateToProps, mapDispatchToProps),
)(OmniSearch);
