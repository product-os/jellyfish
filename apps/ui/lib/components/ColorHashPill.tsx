import React from 'react';
import get from 'lodash/get';
import { Badge, BadgeProps } from 'rendition';
import { stringToNumber } from '../services/helpers';

export interface ColorHashPillProps extends Omit<BadgeProps, 'children'> {
	value: string;
}

const ColorHashPill: React.FunctionComponent<ColorHashPillProps> = ({
	value,
	...rest
}) => {
	if (!value) {
		return null;
	}

	const SHADE_MAP = {
		open: 1,
		closed: 5,
		balenaLabs: 4,
		balenaCloud: 9,
		openBalena: 16,
		balenaEtcher: 6,
		balenaOS: 20,
		balenaEngine: 2,
		balenaFin: 15,
	};

	return (
		<Badge
			{...rest}
			// @ts-ignore
			xsmall
			shade={get(SHADE_MAP, [value], stringToNumber(value, 22))}
		>
			{value}
		</Badge>
	);
};

export default ColorHashPill;
