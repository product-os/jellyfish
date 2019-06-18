/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global process */
/* eslint-disable no-process-env */
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete'
import * as _ from 'lodash'
import React from 'react'
import TextareaAutosize from 'react-autosize-textarea'
import * as reactDnD from 'react-dnd'
import {
	Card,
	Txt
} from 'rendition'
import styled from 'styled-components'
import {
	selectors,
	sdk,
	store
} from '../../core'
import Link from '../../components/Link'
import * as helpers from '../../services/helpers'
import Icon from '../Icon'
import Container from './Container'
import {
	getTrigger
} from './triggers'

// ReactTextareaAutocomplete autocompletion doesn't work with JSDom, so disable
// it during testing
const ACTIVE = process.env.NODE_ENV !== 'test'
const QUICK_SEARCH_RE = /^\s*\?[\w_-]+/

const QuickSearchPanel = styled(Card) `
	position: fixed;
	background: white;
	bottom: 80px;
	right: 10px;
	width: 400px;
	max-height: 75%;
	overflow: auto;
`

const Loader = () => {
	return <span>Loading</span>
}

const SubAuto = (props) => {
	const {
		value,
		className,
		onChange,
		onKeyPress,
		placeholder
	} = props
	const rest = _.omit(props, [
		'value',
		'className',
		'onChange',
		'onKeyPress',
		'placeholder'
	])
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
	constructor (props) {
		super(props)

		this.onClick = this.onClick.bind(this)
	}

	onClick () {
		this.props.onClick(this.props.card)
	}

	render () {
		const {
			card, connectDragSource
		} = this.props
		return connectDragSource(<span>
			<Link append={card.slug || card.id}>
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

		this.state = {
			showQuickSearchPanel: false,
			value: props.value || '',
			results: null
		}

		this.handleOnKeyPress = this.handleOnKeyPress.bind(this)
		this.handleOnChange = this.handleOnChange.bind(this)
		this.loadResults = _.debounce(this.loadResults.bind(this), 750, {
			leading: true
		})
		this.openQuickSearchItem = this.openQuickSearchItem.bind(this)
	}

	loadResults (typeCard, value) {
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
	}

	handleOnChange (event) {
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

	handleOnKeyPress (event) {
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

		if ((event.which === 13 || event.keyCode === 13) && shouldSend && this.props.onSubmit) {
			this.props.onSubmit(event)
		}
	}

	componentWillUpdate (nextProps) {
		if (nextProps.value !== this.props.value) {
			this.setState({
				value: nextProps.value || ''
			})
		}
	}

	openQuickSearchItem (card) {
		this.setState({
			showQuickSearchPanel: false,
			results: null
		})
	}

	render () {
		const {
			className,
			placeholder,
			user
		} = this.props

		const rest = _.omit(this.props, [
			'className',
			'onChange',
			'onSubmit',
			'placeholder',
			'user',
			'value'
		])

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

				{this.state.showQuickSearchPanel && (
					<QuickSearchPanel p={3}>
						<Txt mb={2}><strong>Quick search results</strong></Txt>

						{!this.state.results && <Icon spin name="cog"/>}

						{this.state.results && this.state.results.length === 0 && (
							<Txt>No results found</Txt>
						)}

						{_.map(this.state.results, (card) => {
							return (
								<div key={card.id}>
									<ConnectedQuickSearchItem
										card={card}
										onClick={this.openQuickSearchItem}
									/>
								</div>
							)
						})}
					</QuickSearchPanel>
				)}
			</React.Fragment>
		)
	}
}

export default AutoCompleteArea
