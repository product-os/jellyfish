import React from 'react';
import { Button, ButtonProps } from 'rendition';

interface PlainButtonProps extends Omit<ButtonProps, 'plain'> {}

export const PlainButton: React.FunctionComponent<PlainButtonProps> = ({
	p = 2,
	...props
}) => {
	return <Button {...props} plain p={p} />;
};
