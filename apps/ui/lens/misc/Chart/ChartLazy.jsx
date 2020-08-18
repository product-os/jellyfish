/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React, {
	Suspense
} from 'react'
import Splash from '../../../components/Splash'
const Chart = React.lazy(() => import('./Chart'))

export default function (props) {
	return <Suspense fallback={Splash}>
		<Chart {...props}/>
	</Suspense>
}
