/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Helmet
} from 'react-helmet'

const PageTitle = ({
	unreadCount
}) => (
	<React.Fragment>
		<Helmet>
			<title>{`Jellyfish${unreadCount ? ` (${unreadCount})` : ''}`}</title>
		</Helmet>
	</React.Fragment>
)

export default React.memo(PageTitle)
