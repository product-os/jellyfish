/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This mixin defines all fields in cards that support a boolean isPending status
module.exports = {
	data: {
		schema: {
			properties: {
				data: {
					properties: {
						isPending: {
							title: 'Pending',
							type: 'boolean',
							default: false
						}
					}
				}
			}
		},
		uiSchema: {
			fields: {
				data: {
					// Don't display the isPending field here as it is displayed
					// separately on the SupportThread lens
					isPending: null
				}
			}
		}
	}
}
