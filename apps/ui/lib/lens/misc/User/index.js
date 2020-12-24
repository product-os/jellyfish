/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	createLazyComponent
} from '../../../components/SafeLazy'

const lens = {
	slug: 'lens-misc-user',
	type: 'lens',
	version: '1.0.0',
	name: 'User lens',
	data: {
		icon: 'address-card',
		format: 'full',
		renderer: createLazyComponent(async () => {
			return {
				default: (await import('./User')).UserLens
			}
		}),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user@1.0.0'
				}
			}
		}
	}
}

export default lens
