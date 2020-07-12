'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const qs = require('qs');
const app = express();

const apiUrl = 'https://slack.com/api';

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.use(express.static(__dirname + '/../')); // html
app.use(express.static(__dirname + '/../public')); // images

// Static Web UI
app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});


app.post('/', (req, res) => {
    // TODO: Need to replace the S3 URL with the one that will be used for circleUp
  const image_number = Math.floor(Math.random() * 9) + 1

  let data = {
    response_type: 'in_channel', // public to the channel
    attachments:[
      {
        image_url: `https://frakes.s3-us-west-2.amazonaws.com/frakes-bot/${image_number}.jpg`
      }
    ]
  };
  res.json(data);
});

app.get('/slack', (req, res) => {
  if (!req.query.code) { // access denied
    res.redirect('/?error=access_denied');
    return;
  }
  const authInfo = {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: req.query.code
  };

  axios.post(`${apiUrl}/oauth.access`, qs.stringify(authInfo))
    .then((result) => {
      // The payload data has been modified since the last version!
      // See https://api.slack.com/methods/oauth.access

      console.log(result.data);

      const { access_token, refresh_token, expires_in, error } = result.data;

      if(error) {
        res.sendStatus(401);
        console.log(error);
        return;
      }

      axios.post(`${apiUrl}/team.info`, qs.stringify({token: access_token})).then((result) => {
        if(!result.data.error) {
          res.redirect(`http://${result.data.team.domain}.slack.com`);
        }
      }).catch((err) => { console.error(err); });

    }).catch((err) => {
      console.error(err);
    });

});