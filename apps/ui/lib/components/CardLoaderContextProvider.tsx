import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { CardLoaderContext } from './CardLoader';
import { actionCreators, selectors } from '../store';

const CardLoaderContextProvider = ({ actions: { getCard }, children }) => {
	const value = React.useMemo(() => {
		return {
			selectCard: selectors.getCard,
			getCard,
		};
	}, [getCard]);

	return (
		<CardLoaderContext.Provider value={value}>
			{children}
		</CardLoaderContext.Provider>
	);
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(_.pick(actionCreators, ['getCard']), dispatch),
	};
};

export default connect(null, mapDispatchToProps)(CardLoaderContextProvider);
