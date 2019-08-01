export const getUnreadMentionsView = (user) => {
	const userName = user.slug.slice(5)

	return {
		type: 'view',
		slug: 'view-unread-mentions',
		id: 'view-unread-mentions',
		name: 'My inbox',
		data: {
			allOf: [
				{
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: [
									'message',
									'whisper'
								]
							},
							data: {
								type: 'object',
								properties: {
									readBy: {
										type: 'array',
										items: {
											type: 'string',
											not: {
												const: user.slug
											}
										}
									},
									payload: {
										type: 'object',
										properties: {
											message: {
												anyOf: [
													{
														pattern: `@${userName}`
													},
													{
														pattern: `!${userName}`
													}
												]
											}
										},
										required: [
											'message'
										],
										additionalProperties: true
									}
								},
								required: [
									'payload'
								],
								additionalProperties: true
							}
						},
						additionalProperties: true
					}
				}
			]
		}
	}
}
