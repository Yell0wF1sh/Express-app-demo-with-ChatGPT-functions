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

router.get("/gpt", (req, res, next) => {
    res.render('gptprompt', { title: 'Express' });
})

router.get('/gpt/paraphraser', (req, res, next) => {
    res.render('gptparaphraser', { title: 'Express', originalText: undefined, paraphraseText: undefined, keywords: undefined });
})

router.post('/gpt/prompt',
    isLoggedIn,
    async (req, res, next) => {
        let completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: req.body.prompt,
            temperature: 0.8,
            max_tokens: 1024,
            n: 1,
            stop: null,
        }).then(results => { return results.data })
            .catch(error => console.log(error))
        const history = new GPTHistoryItem(
            {
                prompt: req.body.prompt,
                answer: completion.choices[0].text,
                createdAt: Date(completion.created),
                userId: req.user._id,
            }
        )
        await history.save()
        res.render('gptanswer', { question: req.body.prompt, answer: completion.choices[0].text })
    }
)

router.get('/gpt/history',
    isLoggedIn,
    async (req, res, next) => {
        let items = await GPTHistoryItem.find({ userId: req.user._id })
        res.render('history', { items })
    }
)

router.get('/gpt/history/clear',
    isLoggedIn,
    async (req, res, next) => {
        await GPTHistoryItem.remove({ userId: req.user._id })
        res.render('history', { items: [] })
    }
)

router.get('/gpt/history/sortByDate',
    isLoggedIn,
    async (req, res, next) => {
        items = await GPTHistoryItem.find({ userId: req.user._id }).sort({ date: 1 })
        res.render('history', { items })
    }
)

// router.post('/gpt/paraphraser',
//     isLoggedIn,
//     async (req, res, next) => {
//         let paraphraseText = await openai.createCompletion({
//             model: "text-davinci-003",
//             prompt: "Give a summary for the following text: " + req.body.promptText,
//             temperature: 0.8,
//             max_tokens: 2048,
//             n: 1,
//             stop: null,
//         })
//         let keywords = await openai.createCompletion({
//             model: "text-davinci-003",
//             prompt: "Give no more than five keywords for the following text: " + req.body.promptText,
//             temperature: 0.8,
//             max_tokens: 2048,
//             n: 1,
//             stop: null,
//         })
//         console.log(req.body.promptedText)
//         console.log(paraphraseText.data.choices[0].text)
//         res.render('gptparaphraser', { originalText: req.body.promptText, paraphraseText: paraphraseText.data.choices[0].text, keywords: keywords.data.choices[0].text })
//     }
// )

router.post('/gpt/paraphraser',
    isLoggedIn,
    async (req, res, next) => {
        let paraphraseText = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: "Give a "
                + (req.body.wordCount == "" ? "" : "exactly " + req.body.wordCount + " words ")
                + "summary for the following text: "
                + req.body.promptText,
            temperature: 0.8,
            max_tokens: 2048,
            n: 1,
            stop: null,
        })
            .then(results => { return results.data.choices[0].text })
            .catch(error => console.error(error));

        let keywords = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: (req.body.keywordCount == "default"
                ? "Give exactly five keywords for the following text: " + req.body.promptText
                : "Give exactly " + req.body.keywordCount + " keywords for the following text: " + req.body.promptText),
            temperature: 0,
            max_tokens: 2048,
            n: 1,
            stop: null,
        })
            .then(results => { return results.data.choices[0].text.split(":")[1] })
            .catch(error => console.error(error));


        if (paraphraseText != undefined || keywords != undefined) {

            const history = new GPTHistoryItem(
                {
                    prompt: "Give a "
                        + (req.body.wordCount == "" ? "" : req.body.wordCount + " words ")
                        + "summary and "
                        + (req.body.keywordCount == "default" ? "only five" : "only " + req.body.keywordCount)
                        + " keywords for the following text: "
                        + req.body.promptText,
                    answer: "Text: "
                        + (paraphraseText == undefined ? "error generating text" : paraphraseText)
                        + "Keywords: "
                        + (keywords == undefined ? "error generating keywords" : keywords),
                    createdAt: new Date(),
                    type: 'paraphrase',
                    userId: req.user._id,
                }
            )
            await history.save()
            res.render('gptparaphraser', { originalText: req.body.promptText, paraphraseText, keywords })
        } else {
            res.render('gptparaphraser', {
                originalText: req.body.promptText,
                paraphraseText: (paraphraseText != undefined ? paraphraseText : "An unexpected error occurred while generating text"),
                keywords: (keywords != undefined ? keywords : "An unexpected error occurred while generating text")
            })
        }
    }
)

module.exports = router;