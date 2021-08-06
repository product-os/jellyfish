/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { connect } from 'react-redux';
import { sdk, selectors } from '../../core';
import ViewLink from './ViewLink';

const mapStateToProps = (state, ownProps) => {
	const homeView = selectors.getHomeView(state);
	return {
		sdk,
		user: selectors.getCurrentUser(state),
		isHomeView: ownProps.card.id === homeView,
	};
};

export default connect(mapStateToProps)(ViewLink);
