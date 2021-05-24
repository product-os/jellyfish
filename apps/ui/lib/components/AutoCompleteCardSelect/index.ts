/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { connect } from 'react-redux';
import { compose } from 'redux';
import { withSetup } from '@balena/jellyfish-ui-components';
import { selectors } from '../../core';
import AutoCompleteCardSelect from './AutoCompleteCardSelect';

const mapStateToProps = (state: any) => {
	return {
		types: selectors.getTypes(state),
	};
};

export default compose<any>(
	withSetup,
	connect(mapStateToProps),
)(AutoCompleteCardSelect);
