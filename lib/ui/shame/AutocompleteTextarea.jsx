/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global process */
/* eslint-disable no-process-env */
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete'
import emoji from 'node-emoji'
import * as _ from 'lodash'
import React from 'react'
import TextareaAutosize from 'react-autosize-textarea'
import {
	Box,
	Card,
	Flex,
	Link,
	Theme,
	Txt
} from 'rendition'
import styled from 'styled-components'
import {
	actionCreators,
	selectors,
	sdk,
	store
} from '../core'
import * as helpers from '../services/helpers'
import * as reactDnD from 'react-dnd'
import Icon from './Icon'

// ReactTextareaAutocomplete autocompletion doesn't work with JSDom, so disable
// it during testing
const ACTIVE = process.env.NODE_ENV !== 'test'

const Container = styled(Box) `
	.rta {
		position: relative;
		font-size: 1em;
		width: 100%;
		height: 100%;
	}
	.rta__loader.rta__loader--empty-suggestion-data {
		border-radius: 3px;
		box-shadow: 0 0 5px rgba(27, 31, 35, 0.1);
		padding: 5px;
	}
	.rta--loading .rta__loader.rta__loader--suggestion-data {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.8);
	}
	.rta--loading .rta__loader.rta__loader--suggestion-data > * {
		position: relative;
		top: 50%;
	}
	.rta__textarea {
		width: 100%;
		height: 100%;
		font-size: 1em;
		border-radius: ${Theme.radius}px;
		border: 1px solid ${Theme.colors.gray.main};
		padding: 8px 16px;
		resize: vertical;
		display: block;
		&:hover {
			box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
		}
		&::placeholder {
			color: ${Theme.colors.gray.main};
		}
	}
	.rta__autocomplete {
		position: absolute;
		display: block;
		margin-top: 1em;
	}
	.rta__autocomplete--top {
		margin-top: 0;
		margin-bottom: 1em;
	}
	.rta__list {
		margin: 0;
		padding: 0;
		background: #fff;
		border: 1px solid #dfe2e5;
		border-radius: 3px;
		box-shadow: 0 0 5px rgba(27, 31, 35, 0.1);
		list-style: none;
	}
	.rta__entity {
		background: white;
		width: 100%;
		text-align: left;
		outline: none;
	}
	.rta__entity:hover {
		cursor: pointer;
	}
	.rta__item:not(:last-child) {
		border-bottom: 1px solid #dfe2e5;
	}
	.rta__entity > * {
		padding-left: 4px;
		padding-right: 4px;
	}
	.rta__entity--selected {
		color: #fff;
		text-decoration: none;
		background: #0366d6;
	}
`
const AutocompleteItem = ({
	entity
}) => {
	return (
		<Flex
			style={{
				minWidth: 160
			}}
		>
			<Txt mr={3}>{entity.emoji}</Txt>
			<Txt>:{entity.key}:</Txt>
		</Flex>
	)
}
const getTrigger = _.memoize(() => {
	return {
		':': {
			dataProvider: (token) => {
				if (!token) {
					return []
				}
				return emoji.search(token).slice(0, 10)
			},
			component: AutocompleteItem,
			output: (item) => { return item.emoji }
		},
		'@': {
			dataProvider: (token) => {
				const usernames = selectors.getAllUsers(store.getState())
					.map(({
						slug
					}) => {
						return `@${slug.replace(/^user-/, '')}`
					})
				if (!token) {
					return usernames
				}
				const matcher = `@${token.toLowerCase()}`
				return usernames.filter((name) => {
					return _.startsWith(name, matcher)
				})
			},
			component: ({
				entity
			}) => { return <div>{entity}</div> },
			output: (item) => { return item }
		},
		'!': {
			dataProvider: (token) => {
				const usernames = selectors.getAllUsers(store.getState())
					.map(({
						slug
					}) => {
						return `@${slug.replace(/^user-/, '')}`
					})
				if (!token) {
					return usernames
				}
				const matcher = `!${token.toLowerCase()}`
				return usernames.filter((name) => {
					return _.startsWith(name, matcher)
				})
			},
			component: ({
				entity
			}) => { return <div>{entity}</div> },
			output: (item) => { return item }
		},
		'?': {
			dataProvider: (token) => {
				const types = selectors.getTypes(store.getState())
					.map(({
						slug
					}) => { return `?${slug}` })
				if (!token) {
					return types
				}
				const matcher = `?${token.toLowerCase()}`
				return types.filter((slug) => {
					return _.startsWith(slug, matcher)
				})
			},
			component: ({
				entity
			}) => {
				return <div>{entity}</div>
			},
			output: (item) => {
				return item
			}
		},
		'#': {
			dataProvider: _.debounce(async (token) => {
				if (!token) {
					return []
				}

				const matcher = token.toLowerCase()

				const cards = await sdk.query({
					type: 'object',
					description: `Tag that matches ${matcher}`,
					properties: {
						type: {
							const: 'tag'
						},
						name: {
							pattern: `^${matcher}`
						},
						data: {
							type: 'object'
						}
					}
				}, {
					limit: 10
				})

				return cards.filter((card) => {
					return _.startsWith(card.name, matcher)
				})
			}, 250, {
				leading: true
			}),
			component: ({
				entity
			}) => {
				return (
					<Flex
						style={{
							minWidth: 160
						}}
						justify="space-between"
					>
						<Txt mr={3}>#{entity.name}</Txt>
						<Txt>x {entity.data.count}</Txt>
					</Flex>
				)
			},
			output: (item) => {
				return `#${item.name}`
			}
		}
	}
})
const Loader = () => {
	return <span>Loading</span>
}
const QUICK_SEARCH_RE = /^\s*\?[\w_-]+/

const SubAuto = (props) => {
	const {
		value, className, onChange, onKeyPress, placeholder
	} = props
	const rest = _.omit(props, [ 'value', 'className', 'onChange', 'onKeyPress', 'placeholder' ])
	return (
		<Container {...rest}>
			<ReactTextareaAutocomplete
				textAreaComponent={{
					component: TextareaAutosize,
					ref: 'innerRef'
				}}
				className={className}
				value={value}
				onChange={onChange}
				onKeyPress={onKeyPress}
				loadingComponent={Loader}
				trigger={ACTIVE ? getTrigger() : {}}
				placeholder={placeholder}
			/>
		</Container>
	)
}

const cardSource = {
	beginDrag (props) {
		return props.card
	}
}

const collect = (connect, monitor) => {
	return {
		connectDragSource: connect.dragSource(),
		isDragging: monitor.isDragging()
	}
}

class QuickSearchItem extends React.Component {
	render () {
		const {
			card, connectDragSource, onClick
		} = this.props
		return connectDragSource(<span>
			<Link onClick={onClick}>
				{card.name || card.slug || card.id}
			</Link>
		</span>)
	}
}

const ConnectedQuickSearchItem = reactDnD.DragSource('channel', cardSource, collect)(QuickSearchItem)

const getSendCommand = (user) => {
	return _.get(user.data, [ 'profile', 'sendCommand' ], 'shift+enter')
}

class AutoCompleteArea extends React.Component {
	constructor (props) {
		super(props)
		this.loadResults = _.debounce((typeCard, value) => {
			const filter = helpers.createFullTextSearchFilter(typeCard.data.schema, value)
			_.set(filter, [ 'properties', 'type' ], {
				type: 'string',
				const: typeCard.slug
			})
			sdk.query(filter)
				.then((results) => {
					this.setState({
						results
					})
				})
		}, 750, {
			leading: true
		})
		this.handleOnChange = (event) => {
			const value = event.target.value
			this.setState({
				value
			})
			if (value.match(QUICK_SEARCH_RE)) {
				const [ typeSlug, ...rest ] = value.trim().split(/\s+/)
				const slug = typeSlug.replace('?', '')
				const types = selectors.getTypes(store.getState())
				const typeCard = _.find(types, {
					slug
				})
				if (!rest.length || !typeCard) {
					return
				}
				this.setState({
					showQuickSearchPanel: true,
					results: null
				})
				this.loadResults(typeCard, rest.join(' '))
				return
			}
			this.setState({
				showQuickSearchPanel: false,
				results: null
			})
			if (this.props.onChange) {
				this.props.onChange(event)
			}
		}
		this.handleOnKeyPress = (event) => {
			const sendCommand = getSendCommand(this.props.user)

			let shouldSend = false

			// If the send command is shift+enter, only submit the text if the shift
			// key is pressed
			if (sendCommand === 'shift+enter') {
				shouldSend = Boolean(event.shiftKey)
			}

			// If the send command is ctrl+enter, only submit the text if the shift
			// key is pressed
			if (sendCommand === 'ctrl+enter') {
				shouldSend = Boolean(event.ctrlKey)
			}

			// If the send command is enter, only submit the text if the shift
			// key is NOT pressed
			if (sendCommand === 'enter') {
				shouldSend = !event.shiftKey && !event.ctrlKey
			}

			if ((event.which === 13 || event.keyCode === 13) && shouldSend && this.props.onTextSubmit) {
				this.props.onTextSubmit(event)
			}
		}
		this.state = {
			showQuickSearchPanel: false,
			value: props.value || '',
			results: null
		}
	}
	componentWillUpdate (nextProps) {
		if (nextProps.value !== this.props.value) {
			this.setState({
				value: nextProps.value || ''
			})
		}
	}
	render () {
		const {
			className,
			placeholder,
			user
		} = this.props
		const rest = _.omit(this.props, [ 'value', 'className', 'onChange', 'onTextSubmit', 'placeholder', 'user' ])

		const sendCommand = getSendCommand(user)

		return (
			<React.Fragment>
				<SubAuto
					className={className}
					value={this.state.value}
					onChange={this.handleOnChange}
					onKeyPress={this.handleOnKeyPress}
					placeholder={placeholder}
					{...rest}
				/>
				<Txt
					style={{
						textAlign: 'right',
						opacity: 0.75
					}}
					fontSize={11}
				>
					Press {sendCommand} to send
				</Txt>

				{this.state.showQuickSearchPanel && (<Card p={3} style={{
					position: 'fixed',
					background: 'white',
					bottom: 80,
					right: 10,
					width: 400,
					maxHeight: '75%',
					overflow: 'auto'
				}}>
					<Txt mb={2}><strong>Quick search results</strong></Txt>
					{!this.state.results && <Icon spin name="cog"/>}
					{this.state.results && this.state.results.length === 0 && (<Txt>No results found</Txt>)}
					{_.map(this.state.results, (card) => {
						return (<div key={card.id}>
							<ConnectedQuickSearchItem card={card} onClick={() => {
								store.dispatch(actionCreators.addChannel({
									target: card.id,
									cardType: card.type
								}))
								this.setState({
									showQuickSearchPanel: false,
									results: null
								})
							}}/>
						</div>)
					})}
				</Card>)}
			</React.Fragment>
		)
	}
}

export default AutoCompleteArea
