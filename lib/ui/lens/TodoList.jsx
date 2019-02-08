/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const core = require('../core')
const store = require('../core/store')
class TodoList extends React.Component {
	constructor (props) {
		super(props)
		this.handleInputChange = (event) => {
			this.setState({
				todoMessage: event.target.value
			})
		}
		this.handleInputKeyPress = (event) => {
			if (event.key === 'Enter') {
				this.addTodo()
			}
		}
		this.handleCheckChange = (event) => {
			const id = event.currentTarget.dataset.id || ''
			const complete = event.currentTarget.checked
			core.sdk.card.update(id, {
				type: 'todo',
				data: {
					complete
				}
			})
				.then(() => {
					core.analytics.track('element.update', {
						element: {
							type: 'todo',
							id
						}
					})
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
			if (complete) {
				this.setState(({
					completedItems
				}) => {
					return {
						completedItems: completedItems.concat(id)
					}
				})
			} else {
				this.setState(({
					completedItems
				}) => {
					return {
						completedItems: _.pull(completedItems, id)
					}
				})
			}
		}
		this.addTodo = () => {
			core.sdk.card.create({
				type: 'todo',
				data: {
					actor: this.props.user.id,
					message: this.state.todoMessage
				}
			})
				.then(() => {
					core.analytics.track('element.create', {
						element: {
							type: 'todo'
						}
					})
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message || error)
				})
			this.setState({
				todoMessage: ''
			})
		}
		this.state = {
			todoMessage: '',
			completedItems: []
		}
	}
	render () {
		const {
			tail
		} = this.props
		return (<React.Fragment>
			<rendition.Flex p={3} style={{
				borderTop: '1px solid #eee'
			}} justify="space-between">
				<rendition.Input
					w="100%"
					mr={3}
					placeholder="What needs to be done?"
					value={this.state.todoMessage}
					onChange={this.handleInputChange}
					onKeyPress={this.handleInputKeyPress}
				/>

				<rendition.Button success={true} onClick={this.addTodo} disabled={!this.state.todoMessage}>
						Add
				</rendition.Button>
			</rendition.Flex>

			<rendition.Box p={3} flex="1" style={{
				overflowY: 'auto'
			}}>
				{Boolean(tail) && _.map(tail, (card) => {
					const complete = card.data.complete || _.includes(this.state.completedItems, card.id)
					return (<rendition.Flex key={card.id} mb={3}>
						<input type="checkbox" data-id={card.id} checked={complete} onChange={this.handleCheckChange}/>

						<rendition.Txt ml={2} style={{
							textDecoration: complete ? 'line-through' : 'none'
						}}>
							{card.data.message}
						</rendition.Txt>
					</rendition.Flex>)
				})}
			</rendition.Box>
		</React.Fragment>)
	}
}
const mapStateToProps = (state) => {
	return {
		user: store.selectors.getCurrentUser(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
const lens = {
	slug: 'lens-todolist',
	type: 'lens',
	version: '1.0.0',
	name: 'Todo list lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(TodoList),
		icon: 'list-ul',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				}
			}
		}
	}
}
exports.default = lens
