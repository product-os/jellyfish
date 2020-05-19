/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import {
	withSetup
} from '../SetupProvider'
import Collapsible from '../Collapsible'
import Icon from '../shame/Icon'

const ResponsiveImg = styled.img `
	height: auto;
	max-width: 100%;
	border-radius: 6px;
	border-top-left-radius: 0;
	display: block;
`

class AuthenticatedImage extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			imageSrc: null,
			error: null
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
				this.setState({
					error: error.message || error
				})
			})
	}

	render () {
		const {
			imageSrc,
			error
		} = this.state

		if (error) {
			const detail = `\`\`\`\n${error}\n\`\`\``
			return (
				<div>
					<span><em>An error occurred whilst loading image</em></span>
					<Collapsible
						title="Details"
						maxContentHeight="70vh"
						flex={1}
					>
						<Markdown>
							{detail}
						</Markdown>
					</Collapsible>
				</div>
			)
		}

		if (!imageSrc) {
			return (
				<Icon name="cog" spin />
			)
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
