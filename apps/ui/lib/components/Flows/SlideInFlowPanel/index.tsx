/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { analytics, actionCreators, sdk, selectors } from '../../../core';
import SlideInFlowPanel from './SlideInFlowPanel';

const mapStateToProps = (state, props) => {
	return {
		sdk,
		analytics,
		types: selectors.getTypes(state),
		flowState: selectors.getFlow(props.flowId, props.card.id)(state),
	};
};

const mapDispatchToProps = (dispatch, ownProps) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['setFlow', 'removeFlow']),
			dispatch,
		),
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(SlideInFlowPanel);
