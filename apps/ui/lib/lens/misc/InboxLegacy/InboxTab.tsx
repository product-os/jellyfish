import _ from 'lodash';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Flex, Search } from 'rendition';
import type { SdkQueryOptions } from '@balena/jellyfish-client-sdk/build/types';
import useDebounce from '../../../hooks/use-debounce';
import { selectors } from '../../../store';
import MarkAsReadButton from './MarkAsReadButton';
import MessageList from './MessageList';
import { useCursorEffect } from '../../../hooks';

const DEFAULT_OPTIONS: SdkQueryOptions = {
	limit: 30,
	sortBy: 'created_at',
	sortDir: 'desc',
};

const DebouncedSearch = (props) => {
	const [term, setTerm] = useState('');
	const debouncedTerm = useDebounce(term, 500);

	React.useEffect(() => {
		props.onChange(debouncedTerm);
	}, [debouncedTerm]);

	const onChange = useCallback((event) => {
		setTerm(event.target.value);
	}, []);

	return <Search className="inbox__search" onChange={onChange} value={term} />;
};

const InboxTab = ({ canMarkAsRead, getQuery }: any) => {
	const user = useSelector(selectors.getCurrentUser(), _.isEqual);
	const groupNames = useSelector(selectors.getMyGroupNames(), _.isEqual);
	const [searchTerm, setSearchTerm] = useState('');
	const query = React.useMemo(() => {
		return getQuery(user, groupNames, searchTerm);
	}, [user, groupNames, searchTerm]);
	const [messages, nextPage, hasNextPage, loading] = useCursorEffect(
		query,
		DEFAULT_OPTIONS,
	);

	return (
		<Flex
			flexDirection="column"
			style={{
				minHeight: 0,
				flex: 1,
			}}
		>
			<Flex p={3}>
				<DebouncedSearch onChange={setSearchTerm} />
				{canMarkAsRead && (
					<MarkAsReadButton
						messages={messages}
						user={user}
						groupNames={groupNames}
					/>
				)}
			</Flex>

			{Boolean(messages) && (
				<MessageList
					nextPage={nextPage}
					tail={messages}
					loading={loading}
					loadedAllResults={!hasNextPage()}
				/>
			)}
		</Flex>
	);
};

export default InboxTab;
