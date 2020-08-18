/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React, {
	Suspense
} from 'react'
import Splash from '../../../components/Splash'
const SupportAuditChart = React.lazy(() => import('./SupportAuditChart'))

export default function (props) {
	return <Suspense fallback={Splash}>
		<SupportAuditChart {...props}/>
	</Suspense>
}
