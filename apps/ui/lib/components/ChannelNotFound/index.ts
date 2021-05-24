/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { connect } from 'react-redux';
import { selectors } from '../../core';
import ChannelNotFound from './ChannelNotFound';

const mapStateToProps = (state) => {
	return {
		// Only display a home link if this is the only channel (apart from the home channel)
		displayHomeLink: selectors.getChannels(state).length === 2,
	};
};

export default connect(mapStateToProps)(ChannelNotFound);
