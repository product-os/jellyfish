import React from 'react';
import { Box, Button, Checkbox, Flex, Modal } from 'rendition';

export const ColumnHider = (props) => {
	const { toggleColumns, tableColumns } = props;
	const [visible, setVisible] = React.useState(false);

	const hideModal = () => setVisible(false);

	return (
		<Box m={2}>
			<Button onClick={() => setVisible(!visible)}>Hide fields</Button>

			{visible && (
				<Modal cancel={hideModal} done={hideModal}>
					<Flex mb={2}>
						<Button mr={2} onClick={() => toggleColumns(tableColumns, false)}>
							Hide all
						</Button>

						<Button onClick={() => toggleColumns(tableColumns, true)}>
							Show all
						</Button>
					</Flex>

					{tableColumns.map((column) => {
						return (
							<Box key={column.label} mb={2}>
								<Checkbox
									checked={column.active}
									label={column.label || column.field}
									onChange={() => toggleColumns(column)}
									toggle
								/>
							</Box>
						);
					})}
				</Modal>
			)}
		</Box>
	);
};
