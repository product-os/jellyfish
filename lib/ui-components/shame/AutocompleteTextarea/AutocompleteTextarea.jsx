/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete'
import * as _ from 'lodash'
import React from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import * as reactDnD from 'react-dnd'
import {
	Card,
	Txt
} from 'rendition'
import styled from 'styled-components'
import Link from '../../Link'
import * as helpers from '../../services/helpers'
import Icon from '../Icon'
import Container from './Container'
import useOnClickOutside from '../../hooks/use-onclickoutside'
import {
	getTrigger
} from './triggers'

const QUICK_SEARCH_RE = /^\s*\?[\w_-]+\s+[\w_-]+/

const QuickSearchPanel = styled(Card) `
	position: fixed;
	background: white;
	color: ${(props) => { return props.theme.colors.text.main }};
	bottom: 80px;
	right: 10px;
	width: 400px;
	max-height: 75%;
	overflow: auto;
`

const LoaderSpan = styled.span `
	color: ${(props) => { return props.theme.colors.text.main }};
	background-color: ${(props) => { return props.theme.colors.background }};
`

const Loader = () => {
	return <LoaderSpan>Loading</LoaderSpan>
}

const SubAuto = (props) => {
	const {
		innerRef,
		onClickOutside,
		enableAutocomplete,
		autoFocus,
		types,
		sdk,
		user,
		value,
		className,
		onChange,
		onKeyPress,
		placeholder
	} = props
	const rest = _.omit(props, [
		'value',
		'className',
		'innerRef',
		'onClickOutside',
		'onChange',
		'onKeyPress',
		'placeholder'
	])
	const [ textareaRef, setTextareaRef ] = React.useState(null)

	if (autoFocus) {
		React.useEffect(() => {
			if (textareaRef) {
				textareaRef.focus()
				// eslint-disable-next-line no-multi-assign
				textareaRef.selectionStart = textareaRef.selectionEnd = 10000
			}
		}, [ textareaRef ])
	}

	const innerRefCallback = (ref) => {
		setTextareaRef(ref)
		if (innerRef) {
			innerRef(ref)
		}
	}

	if (onClickOutside) {
		useOnClickOutside(textareaRef, React.useCallback(onClickOutside))
	}

	// ReactTextareaAutocomplete autocompletion doesn't work with JSDom, so disable
	// it during testing

	return (
		<Container {...rest}>
			<ReactTextareaAutocomplete
				innerRef={innerRefCallback}
				textAreaComponent={{
					component: TextareaAutosize,
					ref: 'inputRef'
				}}
				className={className}
				value={value}
				onChange={onChange}
				onKeyPress={onKeyPress}
				loadingComponent={Loader}
				trigger={enableAutocomplete ? getTrigger(types, sdk, user) : {}}
				placeholder={placeholder}
				maxRows={12}
				listStyle={{
					color: 'black'
				}}
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
			<Link append={card.slug || card.id} data-test="quick-search__result">
				{card.name || card.slug || card.id}
			</Link>
		</span>)
	}
}

const ConnectedQuickSearchItem = reactDnD.DragSource('channel', cardSource, collect)(QuickSearchItem)

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
			const: `${typeCard.slug}@${typeCard.version}`
		})
		this.props.sdk.query(filter, {
			limit: 20,
			sortBy: 'name'
		})
			.then((results) => {
				this.setState({
					results
				})
			})
	}

	componentDidUpdate (prevProps) {
		if (this.props.value !== prevProps.value) {
			this.processInput(this.props.value)
		}
	}

	handleOnChange (event) {
		this.processInput(event.target.value)

		if (this.props.onChange) {
			this.props.onChange(event)
		}
	}

	processInput (value) {
		const {
			types
		} = this.props

		this.setState({
			value
		})

		if (value.match(QUICK_SEARCH_RE)) {
			const [ typeSlug, ...rest ] = value.trim().split(/\s+/)
			const slug = typeSlug.replace('?', '')
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
	}

	handleOnKeyPress (event) {
		const sendCommand = this.props.sendCommand

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

			this.setState({
				value: ''
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
			enableAutocomplete,
			className,
			types,
			sdk,
			user,
			placeholder
		} = this.props

		const rest = _.omit(this.props, [
			'className',
			'onChange',
			'onSubmit',
			'placeholder',
			'sendCommand',
			'value'
		])

		return (
			<React.Fragment>
				<SubAuto
					enableAutocomplete={enableAutocomplete}
					types={types}
					sdk={sdk}
					user={user}
					className={className}
					value={this.state.value}
					onChange={this.handleOnChange}
					onKeyPress={this.handleOnKeyPress}
					placeholder={placeholder}
					{...rest}
				/>

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
