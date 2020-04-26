/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import HomeChannel from './HomeChannel'
import {
	withResponsiveContext
} from '../hooks/ResponsiveProvider'

export default withResponsiveContext(HomeChannel)
