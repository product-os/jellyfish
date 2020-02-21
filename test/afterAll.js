const after = async (test) => {
	await test.backend.disconnect(test.context)
	await test.cache.disconnect()
	await test.kernel.disconnect(test.context)
	await test.queue.destroy()
}

export default after
