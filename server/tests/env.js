// Runs before every test file (jest "setupFiles"), before app code reads process.env.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
process.env.MONGO_URI = 'mongodb://placeholder'; // real URI comes from mongodb-memory-server
process.env.CLIENT_URL = 'http://localhost:5173';
