/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Box
} from 'rendition'
import {
	App
} from '../../../lib/chat-widget'
import {
	sdk
} from '../core'

const Container = styled(Box) `
    display: flex;
    flex-direction: column;
    background-color: white;
    color: #000;
    min-height: 250px;
    max-height: 670px;
    box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
    overflow: hidden;
    border-radius: 8px;
    height: calc(100% - 20px);
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 15;
`

export const ChatWidgetSidebar = ({
	onClose
}) => {
	return (
		<Container
			width={[ 'calc(100% - 20px)', 'calc(100% - 20px)', '376px' ]}
		>
			<App
				sdk={sdk}
				productTitle={'Jelly'}
				product={'jellyfish'}
				onClose={onClose}
			/>
		</Container>
	)
}
