/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	const userAsBackupOwner = {
		name: 'user',
		title: 'Backup owner'
	}

	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-backup-owner-of-has-backup-owner',
		type: 'type@1.0.0',
		name: 'Relationship: is backup owner of/has backup owner',
		data: {
			is_link: true,
			forward: 'is backup owner of',
			reverse: 'has backup owner',
			type_pairs: [
				[ userAsBackupOwner, 'account' ],
				[ userAsBackupOwner, 'contact' ],
				[ userAsBackupOwner, 'opportunity' ]
			]
		}
	}))
}
