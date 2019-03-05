/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const core = require('../core')
const sdk = require('../core/sdk')
const store = require('../core/store')
const helpers = require('../services/helpers')
const {
	loadSchema
} = require('../services/sdk-helpers')

/**
 * A generic class for streaming data to a `tail` property on this.state
 */
class TailStreamer extends React.Component {
	componentWillUnmount () {
		if (this.stream) {
			this.stream.destroy()
		}
	}
	setTail (tail) {
		this.setState({
			tail
		})
	}
	async streamTail (query) {
		if (this.stream) {
			this.stream.destroy()
			this.setState({
				tail: null
			})
		}
		const schema = await loadSchema(query)
		if (!schema) {
			return
		}
		this.stream = await sdk.sdk.stream(schema)

		// Set the initial tail once a stream is ready, to minimize risk of missing
		// timeline data
		sdk.sdk.query(schema)
			.then((data) => {
				this.setTail(_.uniqBy(data.concat(this.state.tail || []), 'id'))
			})
		helpers.debug('STREAMING TAIL USING QUERY', query)
		this.stream.on('update', (response) => {
			const {
				after, before
			} = response.data

			// If before is non-null then the card has been updated
			if (before) {
				this.setState((prevState) => {
					if (prevState.tail) {
						const index = _.findIndex(prevState.tail, {
							id: before.id
						})
						prevState.tail.splice(index, 1, response.data.after)
					}
					return {
						tail: prevState.tail
					}
				})

				return
			}
			const tail = this.state.tail ? this.state.tail.slice() : []
			tail.push(after)
			this.setTail(tail)
		})
		this.stream.on('streamError', (response) => {
			console.error('Received a stream error', response.data)
			core.store.dispatch(store.actionCreators.addNotification('danger', response.data))
		})
	}
}
exports.TailStreamer = TailStreamer
