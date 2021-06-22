/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../core';
import { LoopSelector as InnerLoopSelector } from './LoopSelector';

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state),
		loops: selectors.getLoops(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	const { setActiveLoop } = bindActionCreators(
		_.pick(actionCreators, ['setActiveLoop']),
		dispatch,
	);
	return {
		onSetLoop: (loopSlug?: string) => {
			return setActiveLoop(loopSlug || null);
		},
	};
};

export const LoopSelector = connect(
	mapStateToProps,
	mapDispatchToProps,
)(InnerLoopSelector);
