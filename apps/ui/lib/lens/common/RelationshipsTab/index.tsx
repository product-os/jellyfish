import React from 'react';
import _ from 'lodash';
import memoize from 'memoize-one';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { selectors, actionCreators } from '../../../core';
import {
	getViewId,
	RelationshipsTab as InnerRelationshipsTab,
} from './RelationshipsTab';

export { getRelationships } from './RelationshipsTab';

const mapStateToProps = (state, props) => {
	const viewData = selectors.getViewData(state, getViewId(props.card.id));
	return {
		viewData,
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'loadViewData',
				'getLinks',
				'queryAPI',
				'addChannel',
			]),
			dispatch,
		),
	};
};

export const RelationshipsTab = connect(
	mapStateToProps,
	mapDispatchToProps,
)(InnerRelationshipsTab);
