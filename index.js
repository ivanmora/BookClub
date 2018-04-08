const express = require('express');
const app = express();
const controllers = require('./controllers');
const auth = require('./auth');
const sockets = require('./sockets');

const PORT = 8080;

app.use('/api/*', (req, res) => {
	req.url = req.baseUrl.replace('/api', '');
	app.handle(req, res);
});

app.use(require('cookie-parser')());
app.use(express.json());

auth(app);
controllers(app);
sockets(app);

app.listen(PORT, (err) => {
	if (err) {
		console.log(`Error starting server: ${err}`);
	} else {
		console.log(`App listening on port ${PORT}`)
	}
});
