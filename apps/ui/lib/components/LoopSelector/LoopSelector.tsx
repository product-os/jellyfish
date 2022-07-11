import React from 'react';
import _ from 'lodash';
import type { Contract, LoopContract } from 'autumndb';
import { Select, RenditionSystemProps } from 'rendition';
import styled from 'styled-components';

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

interface LoopDisplayProps extends Omit<RenditionSystemProps, 'color' | 'bg'> {
	option: DefaultOption | LoopOption;
}

const allLoops: DefaultOption = {
	name: 'All loops',
	slug: null,
};

// Display of a particular loop (option or selected value) within the loop selector
const LoopDisplay = ({ option }) => {
	return option.name || option.slug!.replace(/^loop-/, '');
};

export interface LoopSelectorProps extends RenditionSystemProps {
	onSetLoop: (loopVersionedSlug?: string) => void;
	loops: LoopContract[];
	activeLoop: string;
}

// A drop-down component for selecting a loop
export const LoopSelector: React.FunctionComponent<LoopSelectorProps> =
	React.memo(({ onSetLoop, loops, activeLoop, children, ...rest }) => {
		const [activeLoopSlug, activeLoopVersion] = activeLoop.split('@');

		const [selectedLoop, setSelectedLoop] = React.useState(
			_.find(loops, {
				slug: activeLoopSlug,
				version: activeLoopVersion,
			}) || allLoops,
		);

		const loopOptions = React.useMemo(() => {
			return _.concat<DefaultOption | Contract>([allLoops], ...loops);
		}, [loops]);

		const onChange = ({ value }) => {
			setSelectedLoop(value || null);
			onSetLoop(_.get(value, 'slug') && `${value.slug}@${value.version}`);
		};

		return (
			<StyledSelect
				{...rest}
				id="loopselector__select"
				placeholder="Select loop..."
				options={loopOptions}
				value={selectedLoop}
				valueLabel={<LoopDisplay option={selectedLoop} />}
				labelKey={(option) => <LoopDisplay option={option} />}
				valueKey="slug"
				onChange={onChange}
			/>
		);
	});
