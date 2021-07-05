/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import { connect } from 'react-redux';
import { selectors } from '../../../core';
import { LoopSelectWidget as InnerLoopSelectWidget } from './LoopSelectWidget';

const mapStateToProps = (state: any) => {
	return {
		loops: selectors.getLoops(state),
	};
};

const ConnectedLoopSelectWidget = connect(mapStateToProps)(
	InnerLoopSelectWidget,
);

// Wrap in a simple functional component to keep rjsf happy
export const LoopSelectWidget = (props) => (
	<ConnectedLoopSelectWidget {...props} />
);
