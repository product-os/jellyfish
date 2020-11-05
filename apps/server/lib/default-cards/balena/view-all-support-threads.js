/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withBaseSupportView
}) => {
	return mixin(withBaseSupportView)({
		slug: 'view-all-support-threads',
		name: 'All'
	})
}
