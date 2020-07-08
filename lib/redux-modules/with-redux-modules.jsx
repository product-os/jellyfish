/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useReduxModules
} from './use-redux-modules'

export const withReduxModules = () => {
	return (Component) => {
		return (props) => {
			const modules = useReduxModules()

			return (
				<Component modules={modules} {...props} />
			)
		}
	}
}
