
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const Bluebird = require('bluebird')
const md5 = require('blueimp-md5')
const _ = require('lodash')
const React = require('react')
const rendition = require('rendition')
const Icon = require('./Icon')

const GRAVATAR_URL = 'https://www.gravatar.com/avatar/'

const getGravatar = (() => {
	const cache = {}

	return async (email) => {
		if (cache[email]) {
			return cache[email]
		}

		const url = await new Bluebird((resolve) => {
			// The query string makes gravatar return a 404 if the image is not found.
			// Ordinarily gravatar will return a default image if the avatar isn't found
			const avatarUrl = `${GRAVATAR_URL + md5(email.trim())}?d=404`
			const img = new Image()
			img.src = avatarUrl
			img.onload = () => {
				return resolve(avatarUrl)
			}
			img.onerror = () => {
				return resolve('')
			}
		})

		cache[email] = url

		return url
	}
})()

class Gravatar extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			avatarUrl: ''
		}
		if (this.props.email) {
			this.load(this.props.email)
		}
	}

	componentWillReceiveProps (nextProps) {
		if (this.props.email !== nextProps.email) {
			if (nextProps.email) {
				this.load(nextProps.email)
			} else {
				this.setState({
					avatarUrl: ''
				})
			}
		}
	}

	load (email) {
		getGravatar(email)
			.then((avatarUrl) => {
				return this.setState({
					avatarUrl
				})
			})
	}

	render () {
		const {
			small
		} = this.props
		const props = _.omit(this.props, [ 'small', 'email' ])
		const style = {
			borderRadius: 3,
			width: 36,
			height: 36,
			textAlign: 'center'
		}
		if (small) {
			style.width = 24
			style.height = 24
		}
		if (this.state.avatarUrl) {
			return (<rendition.Box {...props}>
				<rendition.Img style={style} src={this.state.avatarUrl}/>
			</rendition.Box>)
		}
		style.padding = 4
		return (
			<rendition.Box {...props}>
				<rendition.Flex
					p='4px'
					bg={rendition.Theme.colors.text.light}
					color='white'
					flexDirection='column'
					justifyContent='center'
					style={style}
				>
					<Icon.default name="user"/>
				</rendition.Flex>
			</rendition.Box>
		)
	}
}
exports.default = Gravatar
