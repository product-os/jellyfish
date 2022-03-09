import React from 'react';
import { Button } from 'rendition';
import { useRouter } from '../hooks';

/*
 * It would be better to just use <Button as={Link}></Button>,
 * but then can't make it appear as a button.
 */
export const ButtonLink: React.FunctionComponent<any> = ({
	onClick,
	to,
	...rest
}) => {
	const router = useRouter();

	const handleClick = React.useCallback(() => {
		router.history.push(to);
	}, [router, to]);

	return <Button onClick={handleClick} {...rest} />;
};
