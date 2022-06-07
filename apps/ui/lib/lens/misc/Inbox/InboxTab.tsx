import _ from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Flex, Search } from 'rendition';
import update from 'immutability-helper';
import { useSetup } from '../../../components';
import useDebounce from '../../../hooks/use-debounce';
import { selectors } from '../../../store';
import MarkAsReadButton from './MarkAsReadButton';
import MessageList from './MessageList';
import LiveCollection from '../../common/LiveCollection';

const DEFAULT_OPTIONS = {
	limit: 30,
	sortBy: 'created_at',
	sortDir: 'desc',
	page: 0,
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
	const { sdk } = useSetup() as any;

	const user = useSelector(selectors.getCurrentUser());
	const groupNames = useSelector(selectors.getMyGroupNames());
	const query = getQuery(user, groupNames);

	return (
		<Flex
			flexDirection="column"
			style={{
				minHeight: 0,
				flex: 1,
			}}
		>
			<LiveCollection
				query={query}
				channel={{} as any}
				card={{ slug: 'inbox' } as any}
				useSlices
			/>
		</Flex>
	);
};

export default InboxTab;
