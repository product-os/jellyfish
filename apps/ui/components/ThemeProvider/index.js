/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import * as redux from 'redux'
import {
	connect
} from 'react-redux'
import {
	actionCreators,
	selectors
}	from '../../core'
import ThemeProvider from './ThemeProvider'

const mapStateToProps = (state) => {
	return {
		uiTheme: selectors.getUiTheme(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'setUiTheme'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(ThemeProvider)
