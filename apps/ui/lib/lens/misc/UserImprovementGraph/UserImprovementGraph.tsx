import * as React from 'react';
import * as _ from 'lodash';
import { Box, Checkbox } from 'rendition';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import type { LensRendererProps } from '../../../types';
import { useSetup } from '../../../components';

export type Props = LensRendererProps;

const FDG = React.memo(
	withRouter(
		({
			tail,
			history,
			location,
		}: Pick<Props, 'tail'> & RouteComponentProps) => {
			const { sdk } = useSetup()!;
			const [sagaData, setSagaData] = React.useState({ nodes: [], links: [] });
			const [showSagas, setShowSagas] = React.useState(false);
			const userData: any = {
				nodes: sagaData.nodes,
				links: sagaData.links,
			};

			if (tail && tail.length) {
				for (const user of tail) {
					const userHandle = user.slug.slice(5);
					userData.nodes.push({
						id: user.slug,
						name: userHandle,
						color: '#8369C4',
					});

					const improvements = (user.links?.owns || [])
						.concat(user.links?.['is dedicated to'] || [])
						.concat(user.links?.['contributes to'] || [])
						.concat(user.links?.guides || []);

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

			userData.nodes = _.uniqBy(userData.nodes, 'id');

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

			React.useEffect(() => {
				if (!showSagas) {
					setSagaData({ nodes: [], links: [] });
					return;
				}
				sdk
					.query({
						$$links: {
							'has attached': {
								type: 'object',
								properties: {
									type: { const: 'improvement@1.0.0' },
								},
							},
						},
						type: 'object',
						properties: {
							type: { const: 'saga@1.0.0' },
						},
					})
					.then((sagas) => {
						const graphData: any = {
							nodes: [],
							links: [],
						};
						for (const saga of sagas) {
							const sagaLabel = saga.name || saga.slug;
							graphData.nodes.push({
								id: saga.slug,
								name: sagaLabel,
								color: 'orange',
							});
							for (const improvement of saga.links!['has attached']) {
								const label = improvement.name || improvement.slug;
								graphData.nodes.push({
									id: improvement.slug,
									name: label,
									color: '#00AEEF',
								});

								graphData.links.push({
									source: improvement.slug,
									target: saga.slug,
									value: 40,
									color: '#333',
								});
							}
						}
						setSagaData(graphData);
					})
					.catch(console.error);
			}, [showSagas]);

			return (
				<div ref={$div}>
					<Box p={3} style={{ position: 'absolute', zIndex: 1 }}>
						<Checkbox
							label="Show Sagas"
							onChange={() => setShowSagas(!showSagas)}
							toggle
						/>
					</Box>
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
