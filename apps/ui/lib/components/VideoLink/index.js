/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	compose
} from 'redux'
import {
	connect
} from 'react-redux'
import {
	withTheme
} from 'styled-components'
import {
	selectors,
	sdk
}	from '../../core'
import VideoLink from './VideoLink'

const mapStateToProps = (state) => {
	return {
		sdk,
		types: selectors.getTypes(state)
	}
}

export default compose(
	connect(mapStateToProps),
	withTheme
)(VideoLink)
