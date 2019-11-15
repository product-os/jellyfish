/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
	Flex,
	Search
} from 'rendition'
import {
	useDebouncedCallback
} from 'use-debounce'
import {
	useSetup
} from '@jellyfish/ui-components/SetupProvider'
import Icon from '@jellyfish/ui-components/shame/Icon'
import {
	selectors
} from '../../core'
import MessageList from './MessageList'

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

// TODO An Inbox tab should stream updates from the API
export default (props) => {
	const user = useSelector(selectors.getCurrentUser)

	// State controllers for managing canonical data from the API
	const [ results, setResults ] = useState([])

	// State controllers for paginating over the results in each tab
	const [ page, setPage ] = useState(1)

	// State controllers for search terms in each tab
	const [ searchTerm, setSearchTerm ] = useState('')

	// A little awkward, but we want to access the referenced results value in the
	// stream event handler below. See https://github.com/facebook/react/issues/16154
	const resultsRef = useRef(results)
	resultsRef.current = results

	const {
		sdk
	} = useSetup()

	const options = {
		limit: 30,
		sortBy: 'created_at',
		sortDir: 'desc'
	}

	const loadResults = (term, pageNumber) => {
		const query = props.getQuery(user, term)
		return sdk.query(query, {
			...options,
			limit: options.limit * pageNumber
		})
			.then((data) => {
				setResults(data)
			})
	}

	const updatePage = (newPage) => {
		// If we haven't seen the maximum results, set the new page
		// TODO: Fix this hack once we can fetch a count from the API
		if (options.limit * page === results.length) {
			setPage(newPage)

			// If the search term or page changes, rerun the query
			return loadResults(searchTerm, newPage)
		}

		return null
	}

	// Setup a stream for updates to this query. Since stream creation is
	// asynchronous we need to have a way of closing it using the cleanup return
	// function from `useEffect`, hence the mutable variables at the top of this
	// closure
	useEffect(() => {
		let stream = null
		let canceled = false
		const setupStream = async () => {
			const query = props.getQuery(user, searchTerm)
			stream = await sdk.stream(query)
			if (canceled) {
				stream.close()
				return
			}

			stream.on('update', (update) => {
				const currentResults = resultsRef.current

				// If there are no results to operate on, return early
				if (!currentResults) {
					return
				}

				// If after is null, the card no longer appears in this query and should
				// be removed from the results
				if (update.data.before && update.data.after === null) {
					const updatedResults = currentResults.filter((item) => {
						return item.id !== update.data.before.id
					})

					setResults(updatedResults)
				}

				// If before is null, a new card has been added and should appear in the
				// results
				if (update.data.before === null && update.data.after) {
					setResults([ update.data.after ].concat(currentResults))
				}
			})
		}

		setupStream()

		return () => {
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
		loadResults(searchTerm, page)
	}, [ searchTerm ])

	return (
		<Flex
			flexDirection="column"
			style={{
				height: '100%'
			}}
		>
			<Flex p={3}>
				<DebouncedSearch
					onChange={setSearchTerm}
				/>

				{props.children}
			</Flex>

			{!results && (
				<Box p={3}>
					<Icon name="cog" spin />
				</Box>
			)}

			{Boolean(results) && (
				<MessageList
					page={page}
					setPage={updatePage}
					tail={results}
				/>
			)}
		</Flex>
	)
}
