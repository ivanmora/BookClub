const { User, Club, Invitation } = require('../db/schemas');
const errorHandler = require('./errorHandler');
const bcrypt = require('bcrypt');
const uuidv1 = require('uuid/v1');
const { activeClubUser } = require('./middleware');

const { user } = require('../models');

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
	
		user.add(credentials)
		.then(createSuccess)
		.catch(createFailure);

		function createSuccess(user) {
			res.status(STATUS_SUCCESS);
			res.send(user);
		}

		function createFailure(err) {
			const {
				status,
				message
			} = err;

			console.log(`Error adding user: ${status} ${message}`);
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
