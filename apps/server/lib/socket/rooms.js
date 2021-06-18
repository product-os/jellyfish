/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)

module.exports = (jellyfish) => {
	// A map of socket IDs to user and room IDs
	const sockets = {}

	// Lists of user IDs, keyed by room ID
	const roomOccupants = {}

	const getRoomOccupants = (roomId) => {
		return Array.from(roomOccupants[roomId] || [])
	}

	return {
		getRoomId: async (context, session, query) => {
			// TBD: Is there a more correct way to identify the target contract
			//      from a query?
			let targetContractId = _.get(query, [ 'properties', 'id', 'const' ])
			const targetContractSlug = _.get(query, [ 'properties', 'slug', 'const' ])

			// TBD: Can we avoid having to fetch the card (to get the ID) if the query identifies
			//      it by the slug?
			if (!targetContractId && targetContractSlug) {
				// We've got a slug so need to look up the ID from the slug
				const targetCard = await jellyfish.getCardBySlug(
					context, session, `${targetContractSlug}@1.0.0`)
				targetContractId = _.get(targetCard, [ 'id' ])
			}
			return {
				id: targetContractId
			}
		},

		joinRoom: async (context, session, socket, room) => {
			logger.info(context, `Joining room ${room}`, {
				socketId: socket.id
			})

			try {
				// Get the user ID from the session token
				const userSession = await jellyfish.getCardById(context, session, session)
				const userId = _.get(userSession, [ 'data', 'actor' ])

				// Cache the user and room ID
				sockets[socket.id] = {
					userId,
					room
				}

				// Add the user to the room occupants cache
				if (!roomOccupants[room]) {
					roomOccupants[room] = new Set()
				}
				roomOccupants[room].add(userId)

				const users = getRoomOccupants(room)

				// Join the socket.io room
				socket.join(room)

				// Notify the client about the room occupants
				socket.emit('room-occupants', {
					room,
					users
				})

				// Notify other room occupants that a new user has joined
				socket.broadcast.to(room).emit('user-joined', {
					room,
					userId,
					users
				})
			} catch (error) {
				logger.error(context, 'Error while joining room', error)
			}
		},

		leaveRoom: (context, socket) => {
			if (!sockets[socket.id]) {
				return
			}
			const {
				userId, room
			} = sockets[socket.id]
			logger.info(context, `Leaving room ${room}`, {
				room,
				socketId: socket.id
			})
			try {
				if (room in socket.rooms) {
					// Remove user from the room occupants cache
					if (roomOccupants[room]) {
						roomOccupants[room].delete(userId)
					}

					const users = getRoomOccupants(room)

					// Leave the socket.io room
					socket.leave(room)

					// TEMP
					socket.leave('blah')

					// Notify the other room occupants that a user has left
					socket.broadcast.to(room).emit('user-left', {
						room,
						userId,
						users
					})
				} else {
					logger.warn(context, `Socket ${socket.id} is not in room ${room}`)
				}
			} catch (error) {
				logger.error(context, 'Error while leaving room', error)
			}
		}
	}
}
