const express = require('express')

const router = express.Router();

module.exports = () => {
    router.get('/', (request, response) => {
        response.render('pages/index', {username:"Chris Haliga"})
    });
    return router;
};