/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'

const throwOnRetry = () => {
	throw new Error('Retrying the action that did not fail')
}

export const useTask = (fn) => {
	const [ state, setState ] = React.useState({
		started: false,
		finished: false,
		error: null,
		retry: throwOnRetry,
		result: null
	})

	return React.useMemo(() => {
		const exec = async (...args) => {
			setState({
				started: true,
				finished: false,
				error: null,
				retry: throwOnRetry,
				result: null
			})

			let result = null
			try {
				const data = await fn(...args)

				setState(result = {
					started: false,
					finished: true,
					error: null,
					retry: throwOnRetry,
					result: data
				})
			} catch (err) {
				console.error(err)

				setState(result = {
					started: false,
					finished: true,
					error: err,
					retry: () => { return exec(...args) },
					result: null
				})
			}

			return result
		}

		return {
			...state,
			exec
		}
	}, [ state ])
}

export const useCombineTasks = (...tasks) => {
	return React.useMemo(() => {
		let started = false
		let finished = true
		let error = null
		const retries = []

		for (const task of tasks) {
			started = started || task.started
			finished = finished && task.finished
			error = error || task.error

			if (task.error) {
				retries.push(task.retry)
			}
		}

		return {
			started,
			finished,
			error,
			retry: retries.length
				? () => {
					return retries.forEach((retry) => {
						return retry()
					})
				}
				: throwOnRetry
		}
	}, tasks.reduce((deps, task) => {
		return deps.concat(
			task.started,
			task.finished,
			task.error,
			task.result
		)
	}, []))
}
