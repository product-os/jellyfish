/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import {
	selectors
}	from '../../core'
import ThemeProvider from './ThemeProvider'

const mapStateToProps = (state) => {
	return {
		uiTheme: selectors.getUiTheme(state)
	}
}

export default connect(mapStateToProps)(ThemeProvider)
