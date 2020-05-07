const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const Twitter = require('twit');


const {
  getOAuthRequestToken,
  getOAuthAccessTokenWith,
  oauthGetUserById
} = require('./oauth-utilities')

const path = require('path')
const fs = require('fs')

const TEMPLATE = fs.readFileSync(path.resolve(__dirname, 'client', 'template.html'), { encoding: 'utf8' })

const COOKIE_SECRET = process.env.npm_config_cookie_secret || process.env.COOKIE_SECRET

main()
  .catch(err => console.error(err.message, err))

async function main () {
  const app = express()
  app.use(cookieParser())
  app.use(session({ secret: COOKIE_SECRET || 'secret' }))

  app.listen(3000, () => console.log('listening on http://127.0.0.1:3000'))

  app.get('/', async (req, res, next) => {
    console.log('/ req.cookies', req.cookies)
    if (req.cookies && req.cookies.twitter_screen_name) {
      console.log('/ authorized', req.cookies.twitter_screen_name)
      return res.send(TEMPLATE.replace('CONTENT', `
        <h1>Hello ${req.cookies.twitter_screen_name}</h1>
        <br>
        <a href="/twitter/logout">logout</a>
      `))
    }
    return next()
  })
  app.use(express.static(path.resolve(__dirname, 'client')))

  app.get('/twitter/logout', logout)
  function logout (req, res, next) {
    res.clearCookie('twitter_screen_name')
    req.session.destroy(() => res.redirect('/'))
  }

  app.get('/twitter/authenticate', twitter('authenticate'))
  app.get('/twitter/authorize', twitter('authorize'))
  function twitter (method = 'authorize') {
    return async (req, res) => {
      console.log(`/twitter/${method}`)
      const { oauthRequestToken, oauthRequestTokenSecret } = await getOAuthRequestToken()
      console.log(`/twitter/${method} ->`, { oauthRequestToken, oauthRequestTokenSecret })

      req.session = req.session || {}
      req.session.oauthRequestToken = oauthRequestToken
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`
      console.log('redirecting user to ', authorizationUrl)
      res.redirect(authorizationUrl)
    }
  }

  app.get('/twitter/callback', async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session
    const { oauth_verifier: oauthVerifier } = req.query
    console.log('/twitter/callback', { oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })

    const { oauthAccessToken, oauthAccessTokenSecret, results } = await getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })
    req.session.oauthAccessToken = oauthAccessToken

    const { user_id: userId /*, screen_name */ } = results
    const user = await oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret })

    // req.session.twitter_screen_name = user.screen_name
    // res.cookie('twitter_screen_name', user.screen_name, { maxAge: 900000, httpOnly: true })

    // console.log('user succesfully logged in with twitter', user.screen_name)
    // req.session.save(() => res.redirect('/'))

     console.log('user succesfully logged in with twitter', user.screen_name)

    req.session.twitter_screen_name = user.screen_name
    res.cookie('twitter_screen_name', user.screen_name, { maxAge: 900000, httpOnly: true })

    console.log('user succesfully logged in with twitter', user.screen_name)
    req.session.save(() => res.redirect('/'))
  })
app.post('/login', function (req, res) {
    var user_name = req.body.user;
    var password = req.body.password;
    console.log("User name = " + user_name + ", password is " + password);
    res.end("yes");
  });
let cache = [];
  let cacheAge = 0;

  app.get('/api/home', (req, res) => {
    if (Date.now() - cacheAge > 60000) {
      cacheAge = Date.now();
      const params = { tweet_mode: 'extended', count: 200 };
      if (req.query.since) {
        params.since_id = req.query.since;
      }
      oauthConsumer
        .get(`statuses/home_timeline`, params)
        .then(timeline => {
          cache = timeline;
          res.send(timeline);
        })
        .catch(error => res.send(error));
    } else {
      res.send(cache);
    }
  });

  app.post('/api/favorite/:id', (req, res) => {
    const path = req.body.state ? 'create' : 'destroy';
    oauthConsumer
      .post(`favorites/${path}`, { id: req.params.id })
      .then(tweet => res.send(tweet))
      .catch(error => res.send(error));
  });

  app.post('/api/retweet/:id', (req, res) => {
    const path = req.body.state ? 'retweet' : 'unretweet';
    oauthConsumer
      .post(`statuses/retweet/${req.params.id}`)
      .then(tweet => res.send(tweet))
      .catch(error => res.send(error));
  });

}

