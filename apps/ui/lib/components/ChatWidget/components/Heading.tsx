import React from 'react';
import { Txt, TxtProps } from 'rendition';

interface Props extends TxtProps {
	primaryText: string;
	secondaryText: string;
}

export const Heading = ({ primaryText, secondaryText, ...rest }: Props) => {
	return (
		<Txt mb="40px" align="center" {...rest}>
			<Txt mt="12px" mb="14px" fontSize="34px">
				{primaryText}
			</Txt>
			<Txt fontSize="13px">{secondaryText}</Txt>
		</Txt>
	);
};
