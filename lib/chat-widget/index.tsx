/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import 'circular-std'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'rendition';
import { SidebarSupportChat } from './components/SidebarSupportChat';

ReactDOM.render(
	(
		<Provider>
			<SidebarSupportChat
				token="8d6f0b8e-3749-4c95-af80-04ccd0c5a6b4"
				apiUrl={process.env.API_URL!}
			/>
		</Provider>
	),
	document.getElementById('app')
)
