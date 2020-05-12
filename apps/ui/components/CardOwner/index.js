/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	withRouter
} from 'react-router-dom'
import {
	compose
} from 'redux'
import CardOwner from './CardOwner'
import {
	withLink
} from '../../../../lib/ui-components/LinksProvider'

export default compose(
	withRouter,
	withLink('is owned by', 'cardOwner')
)(CardOwner)
