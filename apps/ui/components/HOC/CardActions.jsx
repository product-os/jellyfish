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
	selectors
}	from '../../core'
import CardActions from '../../../../lib/ui-components/CardActions'
import {
	withSetup
} from '../../../../lib/ui-components/SetupProvider'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state)
	}
}

export default compose(
	withSetup,
	connect(mapStateToProps)
)(CardActions)
