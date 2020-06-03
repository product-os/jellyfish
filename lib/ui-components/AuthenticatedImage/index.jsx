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

const ResponsiveImg = styled.img(({
	maxImageSize
}) => {
	return {
		maxWidth: `min(${maxImageSize}, 100%)`,
		maxHeight: maxImageSize,
		borderRadius: '6px',
		borderTopLeftRadius: 0,
		display: 'block'
	}
})

class AuthenticatedImage extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			imageSrc: null,
			error: null
		}
	}

	componentDidMount () {
		const {
			sdk,
			cardId,
			fileName,
			mimeType
		} = this.props
		sdk.getFile(cardId, fileName)
			.then((data) => {
				const blob = new Blob([ data ], {
					type: mimeType
				})
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
		const {
			maxImageSize
		} = this.props

		if (error) {
			const detail = `\`\`\`\n${error}\n\`\`\``
			return (
				<div>
					<span
						data-test={this.props['data-test']}
					><em>An error occurred whilst loading image</em></span>
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
				maxImageSize={maxImageSize}
			/>
		)
	}
}

export default withSetup(AuthenticatedImage)
