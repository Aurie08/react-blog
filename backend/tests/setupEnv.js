process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://blog:blog@localhost:5432/blog_test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_SSL = 'false';
