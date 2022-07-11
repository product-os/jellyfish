import React from 'react';
import _ from 'lodash';
import { connect, useSelector } from 'react-redux';
import { selectors } from '../../store';

import _ from 'lodash';
import type { Contract, LoopContract } from 'autumndb';
import { Select, RenditionSystemProps } from 'rendition';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

const StyledSelect = styled(Select)`
	button {
		color: white;
		height: 38px;
		padding-left: 8px;
		width: 180px;
	}

	svg {
		stroke: white;
	}
`;

interface DefaultOption {
	name: string;
	slug: null;
}

interface LoopOption {
	name?: string | null;
	slug: string;
	version: string;
}

const allLoops: DefaultOption = {
	name: 'Select loop',
	slug: null,
};

// Display of a particular loop (option or selected value) within the loop selector
const LoopDisplay = ({ option }) => {
	if (option === null) {
		return allLoops.name;
	}
	return option.name || option.slug!.replace(/^loop-/, '');
};

// A drop-down component for selecting a loop
export const LoopSelector = React.memo(() => {
	const loops = useSelector(selectors.getLoops());
	const channels = useSelector(selectors.getChannels());
	const history = useHistory();
	let activeLoop: LoopContract | null = null;
	// Find the loop that has an id or slug matching the target of a channel
	for (const channel of channels) {
		for (const loop of loops) {
			if (
				loop.id === channel.data.target ||
				loop.slug === channel.data.target
			) {
				activeLoop = loop;
				break;
			}
			if (activeLoop) {
				break;
			}
		}
	}

	const loopOptions = React.useMemo(() => {
		return _.concat<DefaultOption | Contract>([allLoops], ...loops);
	}, [loops]);

	const onChange = ({ value }) => {
		if (value) {
			history.push(value.slug);
		} else {
			history.push('/');
		}
	};

	return (
		<StyledSelect
			ml={3}
			id="loopselector__select"
			placeholder="Select loop..."
			options={loopOptions}
			valueLabel={<LoopDisplay option={activeLoop} />}
			labelKey={(option) => <LoopDisplay option={option} />}
			valueKey="slug"
			onChange={onChange}
		/>
	);
});
