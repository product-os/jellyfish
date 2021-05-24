/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { connect } from 'react-redux';
import _ from 'lodash';
import { selectors } from '../../core';
import PageTitle from './PageTitle';

const mapStateToProps = (state) => {
	const mentions = selectors.getInboxViewData(state);
	const channels = selectors.getChannels(state);
	return {
		activeChannel: channels.length > 1 ? channels[channels.length - 1] : null,
		unreadCount: _.get(mentions, ['length'], 0),
	};
};

export default connect(mapStateToProps)(PageTitle);
