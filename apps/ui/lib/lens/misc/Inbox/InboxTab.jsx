/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import _ from 'lodash'
import React, {
	useCallback,
	useEffect,
	useRef,
	useState
} from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Flex,
	Search
} from 'rendition'
import {
	useDebouncedCallback
} from 'use-debounce'
import update from 'immutability-helper'
import {
	useSetup
} from '@balena/jellyfish-ui-components'
import {
	selectors
} from '../../../core'
import MarkAsReadButton from './MarkAsReadButton'
import MessageList from './MessageList'

const DEFAULT_OPTIONS = {
	limit: 30,
	sortBy: 'created_at',
	sortDir: 'desc',
	page: 0
}

const STREAM_ID = 'inbox'

const DebouncedSearch = (props) => {
	const [ term, setTerm ] = useState('')
	const [ debouncedSetTerm ] = useDebouncedCallback(
		(value) => {
			props.onChange(value)
		},
		500
	)

	const onChange = useCallback((event) => {
		setTerm(event.target.value)
		debouncedSetTerm(event.target.value)
	}, [])

	return (
		<Search
			onChange={onChange}
			value={term}
		/>
	)
}

const InboxTab = ({
	getQuery,
	currentTab,
	setupStream,
	clearViewData,
	paginateStream,
	canMarkAsRead
}) => {
	const {
		sdk
	} = useSetup()

	const user = useSelector(selectors.getCurrentUser)
	const groupNames = useSelector(selectors.getMyGroupNames)
	const inboxData = useSelector(selectors.getInboxViewData)
	const unreadMentions = canMarkAsRead ? useSelector(selectors.getInboxViewData) : []

	const [ loading, setLoading ] = useState(true)

	const [ messages, setMessages ] = useState(unreadMentions)

	const [ page, setPage ] = useState(DEFAULT_OPTIONS.page)

	const [ searchTerm, setSearchTerm ] = useState('')

	const [ loadedAllResults, setLoadedAllResults ] = useState(false)

	// Set up messageRef so we do not have a stale closure
	const messagesRef = useRef(messages)
	messagesRef.current = messages

	const appendMessage = (message) => {
		setMessages([ ...messagesRef.current, message ])
	}

	const removeMessage = (messageId) => {
		const updatedMessages = messagesRef.current.filter((message) => {
			return message.id !== messageId
		})
		setMessages(updatedMessages)
	}

	const upsertMessage = (updatedMessage) => {
		const messageIndex = _.findIndex(messagesRef.current, [ 'id', updatedMessage.id ])
		const messageNotInState = messageIndex === -1
		if (messageNotInState) {
			appendMessage(updatedMessage)
			return
		}
		const updatedMessages = update(messagesRef.current, {
			[messageIndex]: {
				$set: updatedMessage
			}
		})
		setMessages(updatedMessages)
	}

	const viewHandlers = {
		upsert: upsertMessage,
		append: appendMessage,
		remove: removeMessage,

		// Set is undefined because setupStream dispatches this handler
		// and this is not a redux action. Instead we wait till the data
		// is resolved from setupStream and set it manually in our useEffect
		set: _.noop
	}

	const loadViewData = async () => {
		setLoading(true)
		const query = getQuery(user, groupNames, searchTerm)
		const currentMessages = await setupStream(STREAM_ID, query, DEFAULT_OPTIONS, viewHandlers)
		setMessages(currentMessages)
		setLoading(false)
	}

	const loadMoreViewData = async (nextPage) => {
		setLoading(true)
		const query = getQuery(user, groupNames, searchTerm)
		const options = {
			...DEFAULT_OPTIONS,
			page: nextPage
		}
		const newMessages = await paginateStream(STREAM_ID, query, options, _.noop)
		setMessages([ ...messagesRef.current, ...newMessages ])

		// Hack to determine if we have reached
		// the beginning of the timeline.
		// TODO replace with a check against count
		// once we can retrieve a count with our
		// query
		if (newMessages.length === 0 || newMessages.length < DEFAULT_OPTIONS.limit) {
			setLoadedAllResults(true)
		}
		setLoading(false)
	}

	const loadNextPage = async () => {
		if (!loadedAllResults && !loading) {
			const nextPage = page + 1
			await setPage(nextPage)
			await loadMoreViewData(nextPage)
		}
	}

	// If the searchTerm or currentTab changes
	// then we need to reload the data
	useEffect(() => {
		loadViewData()
		return () => {
			clearViewData(null, {
				viewId: STREAM_ID
			})
		}
	}, [ currentTab, searchTerm ])

	return (
		<Flex
			flexDirection="column"
			style={{
				minHeight: 0,
				flex: 1
			}}
		>
			<Flex p={3}>
				<DebouncedSearch
					onChange={setSearchTerm}
				/>
				<MarkAsReadButton
					inboxData={inboxData}
					canMarkAsRead={canMarkAsRead}
					user={user}
					groupNames={groupNames}
					sdk={sdk}
				/>

			</Flex>

			{Boolean(messages) && (
				<MessageList
					page={page}
					setPage={loadNextPage}
					tail={messages}
					loading={(loading || !messages)}
					loadedAllResults={loadedAllResults}
				/>
			)}
		</Flex>
	)
}

export default InboxTab
