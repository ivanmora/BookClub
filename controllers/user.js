const { User, Club, Invitation } = require('../models');
const errorHandler = require('./errorHandler');
const bcrypt = require('bcrypt');
const uuidv1 = require('uuid/v1');
const { activeClubUser } = require('./middleware');

const STATUS_ERROR_USER = 422;
const STATUS_ERROR_SERVER = 500;
const STATUS_SUCCESS = 200;

User.getMembershipsById = function(id) {
	return this.findById(id, {
		include: [{ model: Club, attributes: ['id', 'name'], through: { attributes: ['role'] } }],
	});
};

module.exports = function(app) {
	app.get('/user', (req, res) => {
		if (req.user) {
			User.getMembershipsById(req.user.id).then((user) => {
				res.json(user);
			});
		} else {
			res.sendStatus(401);
		}
	});

	app.get('/user/:id', (req, res) => {
		const { id } = req.params;
		User.getMembershipsById(id).then((user) => {
			res.json(user);
		}, errorHandler(res));
	});

	app.post('/user', (req, res) => {

		const credentials = req.body;
	
		validateRequest(credentials)
		.then(checkForExisting)
		.then(generateHash)
		.then(createUser)
		.then(sanitizeUser)
		.then(createSuccess)
		.catch(createFailure);

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

		function createSuccess(user) {
			res.status(STATUS_SUCCESS);
			res.send(user);
		}

		function createFailure(err) {
			const {
				status,
				message
			} = err;

			console.log(`Status: ${status}`, `Message: ${message}`);

			res.status(status);
			res.send(message);
		}

	});

	app.post('/club/:clubId/invite', activeClubUser, async ({ body: { email }, club, user }, res) => {
		try {
			const [newUser] = await User.findOrCreate({ where: { email } });
			const invitation = await Invitation.create({ uuid: uuidv1() });
			await Promise.all([
				newUser.addInvitation(invitation),
				club.addUser(newUser, { through: { role: 'invited' } }),
			]);
			res.json({
				club: await club.reload(),
				invitation,
			});
		} catch (err) {
			errorHandler(res);
		}
	});
};
