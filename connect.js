const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const Twitter = require('twit');


const {
  getOAuthRequestToken,
  getOAuthAccessTokenWith,
  oauthGetUserById,
  oauthGetUserTimeLine
} = require('./oauth-utilities')

const path = require('path')
const fs = require('fs')

const TEMPLATE = fs.readFileSync(path.resolve(__dirname, 'public', 'template.html'), { encoding: 'utf8' })

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
  app.use(express.static(path.resolve(__dirname, 'public')))

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

    const { user_id: userId /*, screen_name */ } = results
    const user1 = await oauthGetUserTimeLine(userId, { oauthAccessToken, oauthAccessTokenSecret })

    req.session.messages = user1.message
    res.cookie('messages', user1.message, { maxAge: 900000, httpOnly: true })

    console.log('user succesfully logged in with twitter', user.screen_name)

    req.session.twitter_screen_name = user.screen_name
    res.cookie('twitter_screen_name', user.screen_name, { maxAge: 900000, httpOnly: true })

    console.log('user succesfully logged in with twitter', user.screen_name)
    req.session.save(() => res.redirect('/'))
  })

  app.get('/twitter/callback', async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session
    const { oauth_verifier: oauthVerifier } = req.query
    console.log('/twitter/callback', { oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })

    const { oauthAccessToken, oauthAccessTokenSecret, results } = await getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })
    req.session.oauthAccessToken = oauthAccessToken

    const { user_id: userId /*, screen_name */ } = results
    const user = await oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret })

    const { user_id: userId /*, screen_name */ } = results
    const user1 = await oauthGetUserTimeLine(userId, { oauthAccessToken, oauthAccessTokenSecret })

    req.session.messages = user1.message
    res.cookie('messages', user1.message, { maxAge: 900000, httpOnly: true })

    console.log('user succesfully logged in with twitter', user.screen_name)

    req.session.twitter_screen_name = user.screen_name
    res.cookie('twitter_screen_name', user.screen_name, { maxAge: 900000, httpOnly: true })

    console.log('user succesfully logged in with twitter', user.screen_name)
    req.session.save(() => res.redirect('/'))
  })

  app.get('/twitter/tweet', function (req, res) {
    makeTweet(function (error, data) {
      if (error) {
        console.log(require('sys').inspect(error));
        res.end('bad stuff happened, none tweetage');
      } else {
        console.log(data);
        res.end('go check your tweets!');
      }
    });
  });

  app.get('/twitter/tweet', async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session
    const { oauth_verifier: oauthVerifier } = req.query
    console.log('/twitter/tweet', { oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })

    const { oauthAccessToken, oauthAccessTokenSecret, results } = await getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })
    req.session.oauthAccessToken = oauthAccessToken

    const { user_id: userId /*, screen_name */ } = results
    const user = await oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret })

    const { user_id: userId /*, screen_name */ } = results
    const user1 = await oauthGetUserTimeLine(userId, { oauthAccessToken, oauthAccessTokenSecret })

    req.session.messages = user1.message
    res.cookie('messages', user1.message, { maxAge: 900000, httpOnly: true })

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

  app.post('/twitter/tweet', async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session
    const { oauth_verifier: oauthVerifier } = req.query
    console.log('/twitter/tweet', { oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })

    const { oauthAccessToken, oauthAccessTokenSecret, results } = await getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier })
    req.session.oauthAccessToken = oauthAccessToken

    const { user_id: userId /*, screen_name */ } = results
    const user = await oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret })

    const { user_id: userId /*, screen_name */ } = results
    const user1 = await oauthGetUserTimeLine(userId, { oauthAccessToken, oauthAccessTokenSecret })

    req.session.messages = user1.message
    res.cookie('messages', user1.message, { maxAge: 900000, httpOnly: true })

    console.log('user succesfully logged in with twitter', user.screen_name)

    req.session.twitter_screen_name = user.screen_name
    res.cookie('twitter_screen_name', user.screen_name, { maxAge: 900000, httpOnly: true })

    console.log('user succesfully logged in with twitter', user.screen_name)
    req.session.save(() => res.redirect('/'))
  })

  app.post('/get_tweets', function (req, res) {
    var feeds = req.body.feeds;
    var topics = req.body.topics;
    var tweets = { feeds: [], topics: [] };//keep all the tweets here

    var cached_feeds_topics = req.session.cached_feeds_topics
    var time_line_lookup = 'http://api.twitter.com/1/statuses/user_timeline.json'
    //If the user is not oauthed make sure you redirect him to the 
    if (!req.session.isOauthed) {
      res.contentType('application/json');
      var msg = messages.redirect_message;
      msg.location = '/connect'
      res.end(JSON.stringify(msg));
      return
    }
    sys.puts("Access Tokens>>" + req.session.oauthAccessToken);
    sys.puts("Access Tokens>>" + req.session.oauthAccessTokenSecret);
    var keys_cached = keys(cached_feeds_topics.feeds)
    var include_keys = {};//What were feeds whose timeline were requested
    feeds.forEach(function (feed) {
      include_keys[feed.name] = 1
    })
    keys_cached.forEach(function (key) {
      if (!include_keys[key]) {
        cached_feeds_topics.feeds[key] = 0;//Remove timeline records for people removed
      }
    })
    var wrapper_feeds = function (item) {
      if (!item)
        return
      var url = ''
      if (cached_feeds_topics.feed[item.name])
        url = time_line_lookup + '?screen_name=' + item.name + '&since_id=' + cached_feeds_topics.feed[item.name] + '&count=20'
      else
        url = time_line_lookup + '?screen_name=' + item.name + '&count=20'

      oauth.consumer().get(url, req.session.oauthAccessToken, req.session.oauthAccessTokenSecret, function (error, data, response) {
        if (error) {
          //There may be many reasons for error how to handle them?
          sys.puts(sys.inspect(error));
          //res.send("Error getting twitter data: " + sys.inspect(error), 500);
          tweets.feeds.push({
            name: item.name,
            tweet: t.text,
            statusCode: error.statusCode,
            reason: error.data.error,
          })
        } else {
          var max_id = cached_feeds_topics.feed[item.name] || -1
          data = JSON.parse(data)

          for (t in data) {
            if (data.hasOwnProperty(t)) {
              if (data[t].id > max_id)
                max_id = data[t].id
              var date = data[t].created_at;
              var match = date.match(dateformatter);
              date = match.slice(1).join(' ');
              tweets.feeds.push({
                name: item.name,
                tweet: data[t].text,
                time: date
              })

            }
          }
          cached_feeds_topics.feed[item.name] = max_id;
          wrapper_feeds(feeds.shift());
          res.contentType('application/json');
          var msg = messages.ok_message
          msg.data = tweets
          res.end(JSON.stringify(msg));
          //req.session.twitterScreenName = data["screen_name"];    
          //res.send('You are signed in: ' + req.session.twitterScreenName)
          //Redirect to index.js from here
        }
      })
    }
    wrapper_feeds(feeds.shift());
  })

  app.post()

  app.post('statuses/update', { status: 'hello world!' }, function (err, data, response) {
    console.log(data)
  });

  app.get('favorites/list', function (error, tweets, response) {
    if (error) throw error;
    console.log(tweets);  // The favorites.
    console.log(response);  // Raw response object.
  });

  //var nconf = require('nconf');
  var Twit = require('twit');
  //var _ = require('lodash');

  //nconf.file({ file: 'config.json' }).env();

  var twitter = new Twit({
    consumer_key: 'z2TotTdV4Ycm0BUs2KZtJU88o',
    consumer_secret: 'sDL2GukVrzcK9NWBO5ZcLgYM1VujRvwvMNchXXJMRmhICZRUR3',
    access_token: 'kk2GTAAAAAABEFnAAAABceMtbxQ',
    access_token_secret: 'leSxKFqvfuhnrR11ZGCk2aLXNAfPG6pc'
  });

  // attach to filter stream
  var tweetStream = twitter.stream('statuses/sample');

  // on tweet
  tweetStream.on('tweet', function (tweet) {
    console.log('---');
    console.log('screen_name:', tweet.user.screen_name);
    console.log('text:', tweet.text);
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
