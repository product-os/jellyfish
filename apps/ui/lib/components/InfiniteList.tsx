import React from 'react';
import { Box, BoxProps } from 'rendition';
import styled from 'styled-components';

const ScrollParent = styled<any>(Box)`
	position: relative;
`;

const ScrollArea = styled<any>(Box)`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
`;

const TRIGGEROFFSET = 200;

const isScrolledToBottom = (element: HTMLDivElement) => {
	const scrollOffset =
		element.scrollHeight - (element.scrollTop + element.offsetHeight);

	return scrollOffset < TRIGGEROFFSET;
};

const isScrolledToTop = (element: HTMLDivElement) => {
	return element.scrollTop < TRIGGEROFFSET;
};

interface InfiniteListProps extends BoxProps {
	onScrollBeginning?: () => void;
	onScrollEnding?: () => void;
	loading?: boolean;
}

export const InfiniteList = React.forwardRef<any, InfiniteListProps>(
	(
		{ onScrollBeginning, onScrollEnding, loading = false, children, ...rest },
		ref,
	) => {
		const scrollAreaRef = React.useRef<HTMLDivElement>(null);
		const wasLoading = React.useRef<boolean>(loading);

		React.useEffect(() => {
			if (!ref) {
				return;
			}

			const instance = {
				scrollToTop(options: any = {}) {
					scrollAreaRef.current?.scrollTo({
						top: 0,
						...options,
					});
				},
				scrollToBottom(options: any = {}) {
					scrollAreaRef.current?.scrollTo({
						top: scrollAreaRef.current!.scrollHeight,
						...options,
					});
				},
				isScrolledToBottom() {
					return (
						scrollAreaRef.current && isScrolledToBottom(scrollAreaRef.current)
					);
				},
				isScrolledToTop() {
					return (
						scrollAreaRef.current && isScrolledToTop(scrollAreaRef.current)
					);
				},
			};

			if (typeof ref === 'function') {
				ref(instance);
			} else {
				ref.current = instance;
			}
		}, []);

		const checkEdges = React.useCallback(() => {
			const element = scrollAreaRef.current!;
			if (isScrolledToTop(element)) {
				if (onScrollBeginning) {
					onScrollBeginning();
				}
			} else if (isScrolledToBottom(element)) {
				if (onScrollEnding) {
					onScrollEnding();
				}
			}
		}, [onScrollBeginning, onScrollEnding]);

		React.useEffect(() => {
			if (!loading && wasLoading.current) {
				checkEdges();
			}
		}, [loading, checkEdges]);

		React.useEffect(() => {
			wasLoading.current = loading;
		}, [loading]);

		const handleScroll = React.useCallback(() => {
			if (!loading) {
				checkEdges();
			}
		}, [loading, checkEdges]);

		return (
			<ScrollParent {...rest}>
				<ScrollArea
					data-test="infinitelist__scrollarea"
					ref={scrollAreaRef}
					onScroll={handleScroll}
				>
					{children}
				</ScrollArea>
			</ScrollParent>
		);
	},
);
