/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import React, {
	useCallback,
	useEffect,
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
	useSetup,
	useDebounce
} from '@balena/jellyfish-ui-components'
import {
	selectors
} from '../../../core'
import MarkAsReadButton from './MarkAsReadButton'
import MessageList from './MessageList'
import {
	circularDeepEqual
} from 'fast-equals'
import * as _ from 'lodash'

const getOptions = (viewId, page) => {
	return {
		// Match the homechannel mentions counter limit
		limit: 100,
		sortBy: 'created_at',
		sortDir: 'desc',
		viewId,
		page
	}
}

const DebouncedSearch = (props) => {
	const [ term, setTerm ] = useState('')
	const debouncedTerm = useDebounce(term, 500)

	React.useEffect(() => {
		props.onChange(debouncedTerm)
	}, [ debouncedTerm ])

	const onChange = useCallback((event) => {
		setTerm(event.target.value)
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
	loadMoreViewData,
	loadViewData,
	removeViewDataItem,
	canMarkAsRead,
	streamId
}) => {
	const {
		sdk
	} = useSetup()

	const user = useSelector(selectors.getCurrentUser)
	const groupNames = useSelector(selectors.getMyGroupNames)

	const [ loadedAllResults, setLoadedAllResults ] = useState(false)
	const [ searchTerm, setSearchTerm ] = useState('')
	const [ loading, setLoading ] = useState(false)
	const [ page, setPage ] = useState(0)

	const viewId = `${streamId}${searchTerm}`

	const inboxData = useSelector((state) => selectors.getViewData(
		state,
		getQuery(user, groupNames, searchTerm),
		getOptions(viewId, page)
	))

	const [ messages, setMessages ] = useState(inboxData || [])

	const loadNextPage = async () => {
		if (!loadedAllResults && !loading) {
			const nextPage = page + 1
			setPage(nextPage)
			setLoading(true)

			const query = getQuery(user, groupNames, searchTerm)
			const options = getOptions(viewId, page)
			await loadMoreViewData(query, options)

			setLoading(false)
		}
	}

	// If the searchTerm or currentTab changes
	// then we need to reload the data
	useEffect(() => {
		const setLocalMessages = async () => {
			setLoading(true)

			const query = getQuery(user, groupNames, searchTerm)
			const options = getOptions(viewId, page)
			const localmessages = await loadViewData(query, options)

			setMessages(localmessages)
			setLoading(false)
		}
		setLocalMessages()

		return () => {
			// We clear the view data for search and switching tabs
			// We shouldn't remove the homechannel inbox stream
			if (viewId !== 'inbox-unread') {
				const query = getQuery(user, groupNames, searchTerm)
				const options = getOptions(viewId, page)
				removeViewDataItem(query, viewId, options)
			}
		}
	}, [ currentTab, searchTerm ])

	// Update the component state when we recieve new inbox data
	useEffect(() => {
		if (!_.isNil(inboxData)) {
			setMessages(inboxData)

			// Hack to determine if we have reached the beginning of the timeline.
			// TODO: replace with a check against count once we can retrieve a count with our query
			const options = getOptions(viewId, page)
			if ((inboxData.length === 0 || (options.limit * page) > inboxData.length) && !loadedAllResults) {
				setLoadedAllResults(true)
			}
		}
	}, [ inboxData ])

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

export default React.memo(InboxTab, circularDeepEqual)
