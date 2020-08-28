/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'
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
	Box,
	Button,
	Flex,
	Search
} from 'rendition'
import {
	useDebouncedCallback
} from 'use-debounce'
import {
	useSetup
} from '@balena/jellyfish-ui-components/lib/SetupProvider'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import {
	selectors
} from '../../core'
import MessageList from './MessageList'
const uuid = require('@balena/jellyfish-uuid')

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

const inboxTab = (props) => {
	const user = useSelector(selectors.getCurrentUser)

	const groupNames = useSelector(selectors.getMyGroupNames)

	// Stae controller for loading state
	const [ loading, setLoading ] = useState(true)

	// State controller for managing canonical data from the API
	const [ results, setResults ] = useState([])

	// State controller for paginating over the results in each tab
	const [ page, setPage ] = useState(1)

	// State controller for search terms in each tab
	const [ searchTerm, setSearchTerm ] = useState('')

	// State controller for showing loading icon when marking all as read
	const [ isMarkingAllAsRead, setIsMarkingAllAsRead ] = useState(false)

	// A little awkward, but we want to access the referenced results value in the
	// stream event handler below. See https://github.com/facebook/react/issues/16154
	const resultsRef = useRef(results)
	resultsRef.current = results

	// Setting up fetch as a ref so that we can avoid a stale closure
	const fetchRef = useRef()

	const {
		sdk
	} = useSetup()

	const options = {
		limit: 30,
		sortBy: 'created_at',
		sortDir: 'desc'
	}

	const markAllAsRead = useCallback(async () => {
		setIsMarkingAllAsRead(true)
		if (results) {
			await Bluebird.map(results, (card) => {
				return sdk.card.markAsRead(user.slug, card, groupNames)
			}, {
				concurrency: 10
			})
		}

		setIsMarkingAllAsRead(false)
	}, [ user.id, results, groupNames ])

	// Setup a stream for updates to this query. Since stream creation is
	// asynchronous we need to have a way of closing it using the cleanup return
	// function from `useEffect`
	useEffect(() => {
		let queryId = null
		let stream = null
		let canceled = false
		const setupStream = async () => {
			const query = props.getQuery(user, groupNames, searchTerm)
			stream = await sdk.stream(query)
			if (canceled) {
				stream.close()
				return null
			}

			stream.on('dataset', (payload) => {
				if (payload.data.id === queryId) {
					const currentResults = resultsRef.current || []
					setResults([ ...currentResults, ...payload.data.cards ])

					// Stop loading spinner
					setLoading(false)
				}
			})

			stream.on('update', (update) => {
				const currentResults = resultsRef.current

				// If there are no results to operate on, return early
				if (!currentResults) {
					return
				}

				// If after is null, the card no longer appears in this query and should
				// be removed from the results
				if (update.data.after === null) {
					const updatedResults = currentResults.filter((item) => {
						return item.id !== update.data.id
					})

					setResults(updatedResults)
				}

				// If type is `insert`, a new card has been added and should
				// appear in the results
				if (update.data.type === 'insert') {
					// Remove last item in results
					currentResults.pop()

					// Add new item at start of array and set results
					setResults([ update.data.after, ...currentResults ])

					// Stop loading spinner
					setLoading(false)
				}
			})

			const loadResults = async (term, pageNumber) => {
				const termQuery = props.getQuery(user, groupNames, term)
				const skip = options.limit * (pageNumber - 1)

				// Start loading spinner
				setLoading(true)

				// Reset `queryId` so that stale results will be ignored
				queryId = await uuid.random()
				stream.emit('queryDataset', {
					error: false,
					data: {
						id: queryId,
						schema: termQuery,
						options: {
							...options,
							skip
						}
					}
				})
			}

			const updatePage = (oldPage) => {
				// If we have been returned the maximum results, set the new page
				// TODO: Fix this hack once we can fetch a count from the API
				if (options.limit * oldPage === resultsRef.current.length) {
					setPage(oldPage + 1)

					// If the search term or page changes, rerun the query
					return loadResults(searchTerm, oldPage + 1)
				}
				return null
			}

			return {
				loadResults,
				updatePage
			}
		}

		fetchRef.current = setupStream()

		return () => {
			queryId = null
			fetchRef.current = null

			canceled = true
			if (stream) {
				stream.close()
			}
		}
	}, [ props.currentTab, searchTerm ])

	// If the search term changes, clear the results so that a loading spinner is
	// shown whilst the new query runs
	useEffect(() => {
		setResults(null)
		fetchRef.current.then((fns) => {
			return fns.loadResults(searchTerm, page)
		})
	}, [ searchTerm ])

	return (
		<Flex
			flexDirection="column"
			style={{
				minHeight: 0
			}}
		>
			<Flex p={3}>
				<DebouncedSearch
					onChange={setSearchTerm}
				/>

				{props.canMarkAsRead && (
					<Button
						ml={3}
						disabled={isMarkingAllAsRead}
						onClick={markAllAsRead}
						data-test="inbox__mark-all-as-read"
						icon={isMarkingAllAsRead ? <Icon name="cog" spin /> : <Icon name="check-circle" />}
					>
						Mark all read
					</Button>
				)}
			</Flex>

			{Boolean(results) && (
				<MessageList
					page={page}
					setPage={async () => {
						return (await fetchRef.current).updatePage(page)
					}}
					tail={results}
				/>
			)}

			{(loading || !results) && (
				<Box p={3}>
					<Icon name="cog" spin />
				</Box>
			)}
		</Flex>
	)
}

export default inboxTab
