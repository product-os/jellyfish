const screenshot = require('../screenshot')

exports.afterEach = async ({
	context, test
}) => {
	if (!test.passed) {
		await screenshot.take(context, test.title)
	}
}

exports.after = async ({
	context
}) => {
	if (context.screenshots) {
		await screenshot.comment(context.screenshots)
	}
}
