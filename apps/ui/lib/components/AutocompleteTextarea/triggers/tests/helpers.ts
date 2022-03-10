const getComponentFromTrigger = async (trigger: any, tag: any, text: any) => {
	const [matching] = await trigger.dataProvider(`${tag}${text}`);
	const div = trigger.component({
		entity: matching,
	});
	return div;
};

const getOutputFromTrigger = async (
	trigger: any,
	tag: string,
	text: string,
) => {
	const [matching] = await trigger.dataProvider(`${tag}${text}`);
	return trigger.output(matching);
};

export { getComponentFromTrigger, getOutputFromTrigger };
