/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import { Select } from 'rendition';
import { LoopContract } from '@balena/jellyfish-types/build/core';

export interface LoopSelectWidgetProps {
	value: string | null;
	onChange: (value: string | null) => void;
	loops: LoopContract[];
}

interface LoopOption {
	value: string;
	label: string;
}

const getLoopOption = (loop: LoopContract): LoopOption => {
	return {
		// The loop field uses the format slug@version
		value: `${loop.slug}@${loop.version}`,
		// Use the name if specified, otherwise strip out
		// the loop type prefix (if any) from the slug
		label: loop.name || loop.slug.replace(/^loop[-\/]/, ''),
	};
};

export const LoopSelectWidget = React.memo<LoopSelectWidgetProps>(
	({ value, onChange, loops }) => {
		const selectedLoopOption = React.useMemo(() => {
			const [slug, version] = (value || '').split('@');
			const selectedLoop = _.find(loops, { slug, version });
			return selectedLoop && getLoopOption(selectedLoop);
		}, [value, loops]);

		const loopOptions = React.useMemo(() => {
			return loops.map(getLoopOption);
		}, [loops]);

		const handleChange = ({ option }: { option?: {} }) => {
			const newLoop = option as LoopOption | undefined;
			onChange(newLoop ? newLoop.value : null);
		};

		return (
			<Select
				clear
				placeholder="Select loop..."
				options={loopOptions}
				valueKey="value"
				labelKey="label"
				value={selectedLoopOption}
				onChange={handleChange}
			/>
		);
	},
);
