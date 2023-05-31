const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { Configuration, OpenAIApi } = require("openai");
const GPTHistoryItem = require('../models/GPTHistoryItem');
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

isLoggedIn = (req, res, next) => {
    if (res.locals.loggedIn) {
        next()
    } else {
        res.redirect('/login')
    }
}

router.get("/codeGenerator", (req, res, next) => {
    res.render('codegene', { title: 'Express' });
})

router.post('/codeGenerator',
    isLoggedIn,
    async (req, res, next) => {
        let prompt = "Generate a code based content and programming language: "
            + "Enter code content: " + req.body.codeContent + ", "
            + "Select code language: " + req.body.codeLanguage;
        let answer = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 1,
            max_tokens: 2048,
            n: 1,
            stop: null,
        })

            .then(result => { return result.data.choices[0].text })
            .catch(error => console.error(error));

        const history = new GPTHistoryItem(
            {
                prompt: "Generate a code based content and programming language: "
                + "Enter code content: " + req.body.codeContent + ", "
                + "Select code language: " + req.body.codeLanguage,
                answer: answer ,
                createdAt: new Date(),
                userId: req.user._id,
            }
        )
        await history.save()
        res.render('codegptAnswer',{ answer });

    }
)

module.exports = router;