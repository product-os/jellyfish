/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '@babel/polyfill'
import 'circular-std'
import React from 'react'
import ReactDOM from 'react-dom'
import {
	App
} from '@jellyfish/chat-widget'

ReactDOM.render(
	<App />,
	document.getElementById('app')
)
