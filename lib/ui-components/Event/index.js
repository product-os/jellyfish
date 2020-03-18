/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Event, {
	getMessage
} from './Event'
import {
	compose
} from 'redux'
import {
	withSetup
} from '../SetupProvider'
import {
	withActor
} from '../HOC'

export {
	getMessage
}

export default compose(
	withSetup,
	withActor
)(Event)
