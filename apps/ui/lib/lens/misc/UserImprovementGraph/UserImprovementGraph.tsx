import * as React from 'react';
import * as _ from 'lodash';
import { LensRendererProps } from '../../../types';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import DraggableContractGraph from '../../common/DraggableContractGraph';
import { TypeContract } from '@balena/jellyfish-types/build/core';
import ForceGraph2D, { ForceGraphProps, GraphData } from 'react-force-graph-2d';

export type Props = LensRendererProps;

const FDG = React.memo(
	withRouter(
		({
			tail,
			history,
			location,
		}: Pick<Props, 'tail'> & RouteComponentProps) => {
			const userData: any = {
				nodes: [],
				links: [],
			};

			if (tail && tail.length) {
				for (const user of tail) {
					const userHandle = user.slug.slice(5);
					userData.nodes.push({
						id: user.slug,
						name: userHandle,
						color: '#8369C4',
					});

					const improvements = (user.links?.owns || []).concat(
						user.links?.['is dedicated to'] || [],
					);

					for (const improvement of improvements) {
						const label = improvement.name || improvement.slug;
						userData.nodes.push({
							id: improvement.slug,
							name: label,
							color: '#00AEEF',
						});
						userData.links.push({
							source: user.slug,
							target: improvement.slug,
							value: 20,
							color: '#333',
						});
					}
				}
			}

			const [height, setHeight] = React.useState();
			const [width, setWidth] = React.useState();

			// Use a ref to set a correct height and width for the force graph
			const $div = React.useCallback((node) => {
				if (node !== null) {
					setHeight(node.getBoundingClientRect().height);
					setWidth(node.getBoundingClientRect().width);
				}
			}, []);

			const openContract = React.useCallback((node) => {
				history.push(`${location.pathname}/${node.id}`);
			}, []);

			return (
				<div ref={$div}>
					<ForceGraph2D
						width={width}
						height={height}
						graphData={userData}
						onNodeClick={openContract}
						nodeAutoColorBy="group"
						nodeColor="color"
						linkColor="color"
						nodeCanvasObject={(node, ctx, globalScale) => {
							let label = (node as any).name || (node.id as string);
							if (label.length > 20) {
								label = label.substring(0, 20) + '...';
							}
							const fontSize = 12 / globalScale;
							ctx.font = `${fontSize}px Sans-Serif`;
							const textWidth = ctx.measureText(label).width;
							const bckgDimensions = [textWidth, fontSize].map(
								(n) => n + fontSize * 0.2,
							); // some padding

							ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
							ctx.fillRect(
								(node.x || 0) - bckgDimensions[0] / 2,
								(node.y || 0) - bckgDimensions[1] / 2,
								bckgDimensions[0],
								bckgDimensions[1],
							);

							ctx.textAlign = 'center';
							ctx.textBaseline = 'middle';
							ctx.fillStyle = (node as any).color;
							ctx.fillText(label, node.x || 0, node.y || 0);

							(node as any).__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
						}}
						nodePointerAreaPaint={(node, color, ctx) => {
							ctx.fillStyle = color;
							const bckgDimensions = (node as any).__bckgDimensions;
							if (bckgDimensions) {
								ctx.fillRect(
									(node.x || 0) - bckgDimensions[0] / 2,
									(node.y || 0) - bckgDimensions[1] / 2,
									bckgDimensions[0],
									bckgDimensions[1],
								);
							}
						}}
					/>
				</div>
			);
		},
	),
);

export default React.memo((props: Props) => {
	const { tail } = props;

	return <FDG tail={tail} />;
});
