/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	__RouterContext as RouterContext
} from 'react-router-dom'

export const useRouter = () => {
	return React.useContext(RouterContext)
}
