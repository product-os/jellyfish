/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	withRouter
} from 'react-router-dom'
import styled from 'styled-components'
import {
	pathWithoutChannel
} from '../services/helpers'
import {
	Button
} from 'rendition'
import Icon from './Icon'

const CloseRenditionButton = styled(Button) `
	i {
		line-height: 1.5;
	}
`

class CloseButtonBase extends React.Component {
	constructor (props) {
		super(props)

		this.navigate = this.navigate.bind(this)
	}

	navigate (event) {
		event.preventDefault()
		const {
			history,
			channel
		} = this.props

		history.push(pathWithoutChannel(channel))

		if (this.props.onClick) {
			this.props.onClick()
		}
	}

	render () {
		return (
			<CloseRenditionButton
				pl={3}
				{...this.props}
				plain
				icon={<Icon name="times"/>}
				onClick={this.navigate}
			/>
		)
	}
}

export const CloseButton = withRouter(CloseButtonBase)
