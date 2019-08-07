import * as React from 'react';
import { Txt } from 'rendition';

export interface HeadingProps {
	primaryText: string;
	secondaryText: string;
}

export const Heading = ({ primaryText, secondaryText }: HeadingProps) => (
	<Txt mb="40px" align="center">
		<Txt mt="12px" mb="14px" fontSize="34px">
			{primaryText}
		</Txt>
		<Txt fontSize="13px">{secondaryText}</Txt>
	</Txt>
);
