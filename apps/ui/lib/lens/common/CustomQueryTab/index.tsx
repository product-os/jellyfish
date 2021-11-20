import React from 'react';
import _ from 'lodash';
import memoize from 'memoize-one';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { selectors, actionCreators } from '../../../core';
import { CustomQueryTab as InnerCustomQueryTab } from './CustomQueryTab';

const mapStateToProps = (state, props) => {
	return {
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['getLinks', 'queryAPI', 'addChannel']),
			dispatch,
		),
	};
};

export const CustomQueryTab = connect(
	mapStateToProps,
	mapDispatchToProps,
)(InnerCustomQueryTab);

const getCustomQueries = memoize((typeCard) => {
	return _.filter(
		_.get(typeCard, ['data', 'meta', 'relationships'], []),
		'query',
	);
});

export const customQueryTabs = (card, typeCard) => {
	const customQueries = getCustomQueries(typeCard);
	return customQueries.map((segment) => (
		<CustomQueryTab key={segment.title} card={card} segment={segment} />
	));
};
