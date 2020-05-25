/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	bindActionCreators,
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
	actionCreators,
	sdk
}	from '../../core'
import VideoLink from './VideoLink'

const mapStateToProps = (state) => {
	return {
		sdk,
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification'
			]),
			dispatch
		)
	}
}

export default compose(
	connect(mapStateToProps, mapDispatchToProps),
	withTheme
)(VideoLink)
