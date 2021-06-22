/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import { SpaceProps } from 'styled-system';
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
			bg={option.slug ? helpers.colorHash(option.slug) : '#fff'}
		>
			{option.name || option.slug!.replace(/^loop-/, '')}
		</HighlightedName>
	),
);

// A drop-down component for selecting a loop
export const LoopSelector: React.FunctionComponent<any> = React.memo(
	({ onSetLoop, loops, user, ...rest }) => {
		const activeLoopVersionedSlug =
			_.get(user, 'data.profile.activeLoop') || '';
		const [activeLoopSlug, activeLoopVersion] =
			activeLoopVersionedSlug.split('@');
		const [activeLoop, setActiveLoop] = React.useState(
			_.find(loops, {
				slug: activeLoopSlug,
				version: activeLoopVersion,
			}) || allLoops,
		);

		const loopOptions = React.useMemo(() => {
			return ([allLoops] as Array<DefaultOption | core.Contract>).concat(
				...loops,
			);
		}, [loops]);

		const onChange = ({ value }) => {
			setActiveLoop(value || null);
			onSetLoop(_.get(value, 'slug') && `${value.slug}@${value.version}`);
		};

		return (
			<Select
				{...rest}
				plain
				placeholder="Select loop..."
				options={loopOptions}
				value={activeLoop}
				valueLabel={<LoopDisplay option={activeLoop} mx={2} />}
				labelKey={(option) => <LoopDisplay option={option} />}
				valueKey="slug"
				onChange={onChange}
			/>
		);
	},
);
