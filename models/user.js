const { User } = require('../db/schemas');
const bcrypt = require('bcrypt');

const STATUS_ERROR_USER = 422;
const STATUS_ERROR_SERVER = 500;

function add(credentials) {

	return validateRequest(credentials)
		.then(checkForExisting)
		.then(generateHash)
		.then(createUser)
		.then(sanitizeUser)

		function validateRequest(credentials) {
			return new Promise((resolve, reject) => {
				const {
					firstName,
					lastName,
					email,
					password
				} = credentials;

				if (
					firstName === undefined ||
					lastName  === undefined ||
					email     === undefined ||
					password  === undefined
					) {
					reject({
						status: STATUS_ERROR_USER,
						message: 'A first name, last name, email address, and a password must be provided'
					});
				} else {
					resolve(credentials);
				}
			});
		}

		function checkForExisting(credentials) {
			return new Promise((resolve, reject) => {
				const {
					email
				} = credentials;

				User.findOne({
					where: { email }
				})
				.then(user => {
					if (user !== null) {
						reject({
							status: STATUS_ERROR_USER,
							message: 'Email address already exists'
						});
					} else {
						resolve(credentials);
					}
				})
			});
		}

		function generateHash(credentials) {
			const { password } = credentials;
			let newCredentials;
			
			return new Promise((resolve, reject) => {
				bcrypt.hash(password, 10, (err, hash) => {
					if (err) {
						reject({
							status: STATUS_ERROR_SERVER,
							message: err
						});
					} else {
						newCredentials = Object.assign(credentials, { password: hash });
						resolve(newCredentials);
					}
				});
			});
		}

		function createUser(credentials) {
			return User.create(credentials)
			.then(user => {
				return user;
			});
		}

		function sanitizeUser(user) {
			const {
				id,
				firstName,
				lastName,
				email
			} = user;

			const sanitiezedUser = {
				id,
				firstName,
				lastName,
				email
			}

			return sanitiezedUser;
		}
}

module.exports = {
	add
}