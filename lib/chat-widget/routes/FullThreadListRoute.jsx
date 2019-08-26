import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Link
} from 'react-router-dom'
import {
    Box,
    Flex
} from 'rendition'
import CardChatSummary from '../../ui-components/CardChatSummary'
import {
    InfiniteList
} from '../../ui-components/InfiniteList'
import {
	useActions
} from '../hooks'
import {
	selectThreads
} from '../store/selectors'

export const FullThreadListRoute = () => {
    const actions = useActions()
    const threads = useSelector(selectThreads())

    const handleScrollEnding = React.useCallback(() => {
        return actions.fetchThreads({
            limit: 30
        })
    }, [])
    
    return (
        <Flex flexDirection="column" flex={1}>
            <Box flex={1} style={{ position: 'relative' }}>
                <InfiniteList onScrollEnding={handleScrollEnding} style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%'
                }}>
                    {threads.map((thread) => {
                        return (
                            <CardChatSummary
                                key={thread.id}
                                getActor={actions.getActor}
                                card={thread}
                                to={`/chat/${thread.id}`}
                                active={false}
                            />
                        )
                    })}
                </InfiniteList>
            </Box>
            <Box>
                <Link to="/new_thread">
					Start new conversation
				</Link>
            </Box>
        </Flex>
    )
}
