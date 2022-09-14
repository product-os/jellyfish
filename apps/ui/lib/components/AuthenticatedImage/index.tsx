import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { withSetup, Setup } from '../SetupProvider';
import Icon from '../Icon';
import { actionCreators, selectors } from '../../store';

const ResponsiveImg = styled.img<{ maxImageSize: number }>(
	({ maxImageSize }) => {
		return {
			maxWidth: `min(${maxImageSize}px, 100%)`,
			maxHeight: `${maxImageSize}px`,
			borderRadius: '6px',
			borderTopLeftRadius: 0,
			display: 'block',
		};
	},
);

interface AuthenticatedImageProps extends Setup {
	cardId: string;
	fileName: string;
	mimeType: string;
	maxImageSize: number;
	'data-test': string;
}

const AuthenticatedImage = React.memo((props: AuthenticatedImageProps) => {
	const { cardId, fileName, maxImageSize, mimeType } = props;
	const imageSrc = useSelector(selectors.getImage(cardId, fileName));
	const dispatch = useDispatch();

	React.useEffect(() => {
		if (!imageSrc) {
			dispatch(actionCreators.setImageSrc(cardId, fileName, mimeType));
		}
	}, []);

	if (!imageSrc) {
		return <Icon name="cog" spin />;
	}

	return (
		<ResponsiveImg
			src={imageSrc}
			data-test={props['data-test']}
			maxImageSize={maxImageSize}
		/>
	);
});

export default withSetup(AuthenticatedImage);
