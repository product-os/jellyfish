/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const React = require('react')
const styledComponents = require('styled-components')
const {
	sdk
} = require('../core')
const ResponsiveImg = styledComponents.default.img `
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
		sdk.getFile(this.props.cardId, this.props.fileName)
			.then((data) => {
				const blob = new Blob([ data ])
				this.setState({
					imageSrc: URL.createObjectURL(blob)
				})
			})
	}
	render () {
		const {
			imageSrc
		} = this.state
		if (!imageSrc) {
			return null
		}
		return <ResponsiveImg src={imageSrc} data-test={this.props['data-test']} />
	}
}
exports.AuthenticatedImage = AuthenticatedImage
