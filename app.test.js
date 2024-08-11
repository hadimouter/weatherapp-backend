const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./app');
const City = require('./models/cities');
const User = require('./models/users');

const newCity = 'Las Vegas';
const newUser = { name: 'Test-LaCapsule', email: 'test@lacapsule.academy', password: 'test123' };

beforeEach(async () => {
	await City.deleteOne({ cityName: new RegExp(newCity, 'i') });
	await User.deleteOne({ email: new RegExp(newUser.email, 'i') });
});

// Existing /weather routes
it('POST /weather', async () => {
	const res = await request(app).post('/weather').send({ cityName: newCity });

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(true);
	expect(res.body).toHaveProperty('weather');
	expect(res.body.weather).toHaveProperty('cityName', newCity);
	expect(res.body.weather).toHaveProperty('description', expect.any(String));
	expect(res.body.weather).toHaveProperty('tempMin', expect.any(Number));
	expect(res.body.weather).toHaveProperty('tempMax', expect.any(Number));
});

it('GET /weather', async () => {
	const newCity2 = 'New York';
	await City.deleteOne({ cityName: newCity2 });

	await request(app).post('/weather').send({ cityName: newCity });
	await request(app).post('/weather').send({ cityName: newCity2 });
	const res = await request(app).get('/weather');

	expect(res.statusCode).toBe(200);
	expect(res.body.weather).toEqual(expect.arrayContaining([
		expect.objectContaining({ cityName: newCity, description: expect.any(String), tempMin: expect.any(Number), tempMax: expect.any(Number) }),
		expect.objectContaining({ cityName: newCity2, description: expect.any(String), tempMin: expect.any(Number), tempMax: expect.any(Number) }),
	]));
});

it('GET /weather/:cityName', async () => {
	await request(app).post('/weather').send({ cityName: newCity });
	const res = await request(app).get(`/weather/${newCity}`);

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(true);
	expect(res.body).toHaveProperty('weather');
	expect(res.body.weather).toHaveProperty('cityName', newCity);
	expect(res.body.weather).toHaveProperty('description', expect.any(String));
	expect(res.body.weather).toHaveProperty('tempMin', expect.any(Number));
	expect(res.body.weather).toHaveProperty('tempMax', expect.any(Number));
});

it('DELETE /weather/:cityName', async () => {
	await request(app).post('/weather').send({ cityName: newCity });
	const res = await request(app).delete(`/weather/${newCity}`);

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(true);
	expect(res.body.weather).toEqual(expect.not.arrayContaining([
		expect.objectContaining({ cityName: newCity }),
	]));
});

it('Users schema & model', () => {
	expect(User).toBeDefined();

	const newFakeUser = new User(newUser);

	expect(newFakeUser).toHaveProperty('_id');
	expect(newFakeUser).toHaveProperty('name', newUser.name);
	expect(newFakeUser).toHaveProperty('email', newUser.email);
	expect(newFakeUser).toHaveProperty('password', newUser.password);
});

// Sign-up
it('POST /users/signup', async () => {
	const res = await request(app).post('/users/signup').send(newUser);

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(true);
});

it('POST /users/signup - Invalid body with missing field', async () => {
	const res = await request(app).post('/users/signup').send({
		name: 'Test2',
		email: 'test2@lacapsule.academy',
	});

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(false);
	expect(res.body.error.toLowerCase()).toContain('missing or empty fields');
});

it('POST /users/signup - Invalid body with empty field', async () => {
	const res = await request(app).post('/users/signup').send({
		name: 'Test3',
		email: '',
		password: 'test123',
	});

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(false);
	expect(res.body.error.toLowerCase()).toContain('missing or empty fields');
});

it('POST /users/signup - Already existing user', async () => {
	const res = await request(app).post('/users/signup').send(newUser);
	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(true);

	const res2 = await request(app).post('/users/signup').send(newUser);
	expect(res2.statusCode).toBe(200);
	expect(res2.body.result).toBe(false);
	expect(res2.body.error.toLowerCase()).toContain('user already exists');
});

// Sign-in
it('POST /users/signin - Valid body', async () => {
	const res = await request(app).post('/users/signup').send(newUser);
	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(true);

	const res2 = await request(app).post('/users/signin').send({
		email: newUser.email,
		password: newUser.password,
	});
	expect(res2.statusCode).toBe(200);
	expect(res2.body.result).toBe(true);
});

it('POST /users/signin - Invalid body with missing field', async () => {
	const res = await request(app).post('/users/signin').send({
		password: 'test123',
	});

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(false);
	expect(res.body.error.toLowerCase()).toContain('missing or empty fields');
});

it('POST /users/signin - Invalid body with empty field', async () => {
	const res = await request(app).post('/users/signin').send({
		email: '',
		password: '',
	});

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(false);
	expect(res.body.error.toLowerCase()).toContain('missing or empty fields');
});

it('POST /users/signin - Not existing user', async () => {
	const res = await request(app).post('/users/signin').send({
		email: newUser.email,
		password: newUser.password,
	});

	expect(res.statusCode).toBe(200);
	expect(res.body.result).toBe(false);
	expect(res.body.error.toLowerCase()).toContain('user not found');
});

it('checkBody module - Valid body', () => {
	const { checkBody } = require('./modules/checkBody');
	const isValid = checkBody({ test1: 1, test2: 2 }, ['test1', 'test2']);

	expect(isValid).toBe(true);
});

it('checkBody module - Invalid body', () => {
	const { checkBody } = require('./modules/checkBody');
	const isValid = checkBody({ test4: 4 }, ['test3', 'test4']);

	expect(isValid).toBe(false);
});

afterAll(async () => {
	await City.deleteOne({ cityName: new RegExp(newCity, 'i') });
	await User.deleteOne({ email: new RegExp(newUser.email, 'i') });
	mongoose.connection.close();
});
