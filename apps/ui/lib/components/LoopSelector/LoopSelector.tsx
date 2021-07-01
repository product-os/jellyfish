/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import { core } from '@balena/jellyfish-types';
import { HighlightedName, Select, RenditionSystemProps } from 'rendition';
import { helpers } from '@balena/jellyfish-ui-components';

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
const LoopDisplay: React.FunctionComponent<LoopDisplayProps> = React.memo(
	({ option, ...rest }) => (
		<HighlightedName
			{...rest}
			data-test={`loop-option--${option.slug}`}
			bg={option.slug ? helpers.colorHash(option.slug) : '#fff'}
		>
			{option.name || option.slug!.replace(/^loop-/, '')}
		</HighlightedName>
	),
);

export interface LoopSelectorProps extends RenditionSystemProps {
	onSetLoop: (loopVersionedSlug?: string) => void;
	loops: core.LoopContract[];
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
			return _.concat<DefaultOption | core.Contract>([allLoops], ...loops);
		}, [loops]);

		const onChange = ({ value }) => {
			setSelectedLoop(value || null);
			onSetLoop(_.get(value, 'slug') && `${value.slug}@${value.version}`);
		};

		return (
			<Select
				{...rest}
				id="loopselector__select"
				plain
				placeholder="Select loop..."
				options={loopOptions}
				value={selectedLoop}
				valueLabel={<LoopDisplay option={selectedLoop} mx={2} />}
				labelKey={(option) => <LoopDisplay option={option} />}
				valueKey="slug"
				onChange={onChange}
			/>
		);
	});
