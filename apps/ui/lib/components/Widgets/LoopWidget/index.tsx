/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import { connect } from 'react-redux';
import { selectors } from '../../../core';
import { LoopWidget as InnerLoopWidget, LoopWidgetProps } from './LoopWidget';

const mapStateToProps = (state: any) => {
	return {
		loops: selectors.getLoops(state),
	}
};

const ConnectedLoopWidget = connect(mapStateToProps)(InnerLoopWidget);

// Wrap as a simple functional component to keep Rendition Form (and rjsf) happy
export const LoopWidget = (props: Omit<LoopWidgetProps, 'loops'>) => <ConnectedLoopWidget {...props} />;
