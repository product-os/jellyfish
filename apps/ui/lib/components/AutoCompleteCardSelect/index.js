/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import {
	compose
} from 'redux'
import {
	selectors
} from '../../core'
import AutoCompleteCardSelect from './AutoCompleteCardSelect'
import {
	withSetup
} from '@balena/jellyfish-ui-components'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

export default compose(
	withSetup,
	connect(mapStateToProps)
)(AutoCompleteCardSelect)
