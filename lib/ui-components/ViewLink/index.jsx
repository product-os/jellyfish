/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	selectors,
	actionCreators
} from '../../../apps/ui/core'
import ViewLink from './ViewLink'

const mapStateToProps = (state, ownProps) => {
	return {
		subscription: selectors.getSubscription(state, ownProps.card.id),
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators({
		setDefault: actionCreators.setDefault
	}, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(ViewLink)
