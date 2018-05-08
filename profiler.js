const profiler = require('v8-profiler')
const fs = require('fs')

profiler.startProfiling()
profilerRunning = true
console.log('started profiling')

require('./lib/index.js')

process.on('SIGINT', () => {
	const profile = profiler.stopProfiling()
	console.log('stopped profiling')
	profile.export((error, result) => {
		fs.writeFileSync('./jellyfish-' + Date.now() + '.cpuprofile', result)
	})
});
