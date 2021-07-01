/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { connect } from 'react-redux';
import { selectors } from '../../core';
import CardLinker from './CardLinker';

const mapStateToProps = (state: any) => {
	return {
		activeLoop: selectors.getActiveLoop(state),
	};
};

export default connect(mapStateToProps)(CardLinker);
