/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	mount
} from '@jellyfish/chat-widget'
import {
	useSetup
} from './SetupProvider'

const Container = styled.div `
    display: flex;
    flex-direction: column;
    background-color: white;
    color: #000;
    width: 376px;
    min-height: 250px;
    max-height: 670px;
    box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
    overflow: hidden;
    border-radius: 8px;
    height: calc(100% - 20px);
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 2147483000;
`

export const ChatWidgetSidebar = ({
	onClose
}) => {
	const {
		sdk
	} = useSetup()
	const container = React.useRef(null)

	React.useEffect(() => {
		mount(container.current, {
			sdk,
			productTitle: 'Jelly',
			product: 'jellyfish',
			onClose
		})
	}, [ sdk, onClose ])

	return (
		<Container ref={container} />
	)
}
