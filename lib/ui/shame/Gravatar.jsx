
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import Bluebird from 'bluebird'
import md5 from 'blueimp-md5'
import _ from 'lodash'
import React from 'react'
import {
	Box,
	Flex,
	Img,
	Theme
} from 'rendition'
import Icon from './Icon'

const GRAVATAR_URL = 'https://www.gravatar.com/avatar/'

const getGravatar = (() => {
	const cache = {}

	return async (email) => {
		if (_.has(cache, email)) {
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

export default class Gravatar extends React.Component {
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
			return (
				<Box {...props}>
					<Img style={style} src={this.state.avatarUrl}/>
				</Box>
			)
		}

		style.padding = 4

		return (
			<Box {...props}>
				<Flex
					p='4px'
					bg={Theme.colors.text.light}
					color='white'
					flexDirection='column'
					justifyContent='center'
					style={style}
				>
					<Icon name="user"/>
				</Flex>
			</Box>
		)
	}
}
