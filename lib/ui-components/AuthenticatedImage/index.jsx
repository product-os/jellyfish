/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	withSetup
} from '../SetupProvider'

const ResponsiveImg = styled.img `
	height: auto;
	max-width: 100%;
`

class AuthenticatedImage extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			imageSrc: null
		}
	}

	componentDidMount () {
		this.props.sdk.getFile(this.props.cardId, this.props.fileName)
			.then((data) => {
				const blob = new Blob([ data ])
				this.setState({
					imageSrc: URL.createObjectURL(blob)
				})
			})
			.catch((error) => {
				this.props.addNotification('danger', error.message || error)
			})
	}

	render () {
		const {
			imageSrc
		} = this.state

		if (!imageSrc) {
			return null
		}

		return (
			<ResponsiveImg
				src={imageSrc}
				data-test={this.props['data-test']}
			/>
		)
	}
}

export default withSetup(AuthenticatedImage)
