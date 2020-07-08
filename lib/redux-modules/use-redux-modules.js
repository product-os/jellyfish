/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	useContext
} from 'react'
import {
	ReduxModulesContext
} from './redux-modules-context'

export const useReduxModules = () => {
	return useContext(ReduxModulesContext)
}
