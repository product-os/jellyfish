/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	modules
} from '../../../../lib/redux-modules'

// Naming should be improved
const instances = {}

instances[modules.groups.id] = modules.groups.factory(modules, (state) => {
	return state.core.groups
})

export {
	instances as modules
}
