import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../core';
import { LoopSelector as InnerLoopSelector } from './LoopSelector';

const mapStateToProps = (state) => {
	return {
		activeLoop: selectors.getActiveLoop(state) || '',
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
