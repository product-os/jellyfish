import _ from 'lodash';
import React from 'react';
import { Input, Flex, Box, Heading, Divider, Txt } from 'rendition';
import { Link } from '../Link';
import { useSetup } from '../SetupProvider';

const FlowdockArchive = () => {
	const [searchTerm, setSearchTerm] = React.useState('');
	const [searchResults, setSearchResults] = React.useState([]);
	const { sdk } = useSetup();
	const onKeyPress = async (event) => {
		if (searchTerm && event.key === 'Enter') {
			let threadId;

			try {
				const url = new URL(searchTerm);
				const path = url.pathname;
				threadId = path.split('/').reverse()[0];
			} catch (_error) {
				// the search term is a text instead of flowdock url.
			}
			const response = await sdk.query({
				type: 'object',
				required: ['type', 'data'],
				properties: {
					type: {
						type: 'string',
						const: 'flowdock-archive@1.0.0',
					},
					data: {
						type: 'object',
						required: ['title', 'flowdockThreadId'],
						properties: {
							...(threadId && {
								flowdockThreadId: { type: 'string', const: threadId },
							}),
						},
					},
				},
				...(!threadId && {
					$$links: {
						'has attached element': {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: 'flowdock-message@1.0.0',
								},
								data: {
									type: 'object',
									properties: {
										content: {
											type: 'string',
											fullTextSearch: {
												term: searchTerm,
											},
										},
									},
								},
							},
						},
					},
				}),
			});
			setSearchResults(response);

			setSearchTerm('');
		}
	};
	return (
		<Flex px={4} py={3} flexDirection="column" flex={1}>
			<Heading.h3>Search Flowdock archive</Heading.h3>
			<Flex pt={2} flexDirection="column" flex={1}>
				<Box maxWidth={500}>
					<Input
						value={searchTerm}
						onKeyPress={onKeyPress}
						onChange={(event) => {
							setSearchTerm(event.target.value);
						}}
						placeholder="Search by flowdock url or message content"
					/>
				</Box>
				<Flex pt={2} flexDirection="column">
					{searchResults.length > 0 &&
						searchResults.map((result) => {
							return (
								<Box>
									<Link to={`/${result.id}`} key={result.id}>
										<Flex flexDirection={'column'}>
											<strong>{result.data.title}</strong>
											{result.links && (
												<Txt>
													{result.links['has attached element']?.map(
														(message) => (
															<Txt color="text.main">
																{message?.data?.content}
															</Txt>
														),
													)}
												</Txt>
											)}
										</Flex>
									</Link>
									<Divider />
								</Box>
							);
						})}
				</Flex>
			</Flex>
		</Flex>
	);
};

export default FlowdockArchive;
