/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import CardLoader from './CardLoader'

const mapStateToProps = (state, props) => {
	return {
		card: props.cardSelector(props.id, props.type)(state)
	}
}

export default connect(mapStateToProps)(CardLoader)
