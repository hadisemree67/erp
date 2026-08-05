const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

module.exports = prisma;
