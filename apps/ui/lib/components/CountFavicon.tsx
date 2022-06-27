import { useSelector } from 'react-redux';
import { selectors } from '../store';
import React from 'react';
import { Helmet } from 'react-helmet';
import { useLabeledImage } from '../hooks';
import { isProduction } from '../environment';

const getLabel = (mentionsCount) => {
	if (!mentionsCount) {
		return null;
	}

	if (mentionsCount > 99) {
		return '99+';
	}

	return mentionsCount + '';
};

export default function CountFavicon() {
	const mentionsCount = useSelector(selectors.getMentionsCount());
	const label = getLabel(mentionsCount);
	const isLoggedIn = useSelector(selectors.getStatus()) === 'authorized';

	const productionIcons = [
		{
			size: 16,
			src: '/icons/jellyfish-16.png',
		},
		{
			size: 32,
			src: '/icons/jellyfish-32.png',
		},
	];

	const devIcons = [
		{
			size: 16,
			src: '/icons/jellyfish-dev-16.png',
		},
		{
			size: 32,
			src: '/icons/jellyfish-dev-32.png',
		},
	];

	const baseIcons = isProduction() ? productionIcons : devIcons;

	// Sizes are proportional to the overall image size
	const baseFontSize = label && label.length > 2 ? 0.5 : 0.625;
	const baseLineWidth = 0.125;
	const labeledIcons = baseIcons.map(({ size, src }) => {
		return {
			size,
			href: useLabeledImage(label, src, {
				width: size,
				height: size,
				fontSize: baseFontSize * size,
				lineWidth: baseLineWidth * size,
			}),
		};
	});

	return isLoggedIn ? (
		<Helmet>
			{labeledIcons.map(({ size, href }) => (
				<link
					key={size}
					rel="shortcut icon"
					href={href}
					type="image/x-icon"
					sizes={`${size}x${size}`}
				/>
			))}
		</Helmet>
	) : (
		<Helmet>
			<link
				rel="shortcut icon"
				href="/icons/jellyfish-bw-16.png"
				type="image/x-icon"
				sizes="16x16"
			/>
			<link
				rel="shortcut icon"
				href="/icons/jellyfish-bw-32.png"
				type="image/x-icon"
				sizes="32x32"
			/>
		</Helmet>
	);
}
