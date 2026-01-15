const express = require('express')
const companion = require('@uppy/companion')
const bodyParser = require('body-parser')
const session = require('express-session')
const ImageKit = require("imagekit");
const path = require('path');
require('dotenv').config()

const PORT = process.env.PORT || 443;
let baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;

// Ensure baseUrl has a protocol (Railway provides domain without protocol)
if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
  baseUrl = `https://${baseUrl}`;
}

if (
  !process.env.IMAGEKIT_PUBLIC_KEY ||
  !process.env.IMAGEKIT_PRIVATE_KEY ||
  !process.env.IMAGEKIT_URL_ENDPOINT 
) {
  console.log(
    `The .env file is not configured. Follow the instructions in the readme to configure the .env file. https://github.com/imagekit-samples/uppy-uploader. A step by step walkthrough of the code is also available at https://docs.imagekit.io/sample-projects/upload-widget/uppy-upload-widget/. If your are running this in Codesandbox, please add secrets in your fork.`
  );
  console.log('');
  process.env.IMAGEKIT_PUBLIC_KEY
    ? ''
    : console.log('Add IMAGEKIT_PUBLIC_KEY to your .env file.');

  process.env.IMAGEKIT_PRIVATE_KEY
    ? ''
    : console.log('Add IMAGEKIT_PRIVATE_KEY to your .env file.');

  process.env.IMAGEKIT_URL_ENDPOINT
    ? ''
    : console.log('Add IMAGEKIT_URL_ENDPOINT to your .env file.');

  process.exit();
}

var imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const app = express();
app.set('view engine', 'ejs');

app.use("/dist", express.static(path.join(__dirname, '..', 'dist')));
app.use(bodyParser.json())
app.use(session({
  secret: 'some-secret',
  resave: true,
  saveUninitialized: true
}))
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Origin, Content-Type, Accept, *');
  next()
})

app.get("/auth", (req, res, next) => {
  res.send(imagekit.getAuthenticationParameters());
})

// Routes
app.get('/', (req, res) => {
  res.render(path.join(__dirname, "..", "client", "index"), {
    IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
    SERVER_BASE_URL: baseUrl
  });
})

// initialize uppy
const uppyOptions = {
  providerOptions: {
    facebook: {
      key: process.env.FACEBOOK_KEY,
      secret: process.env.FACEBOOK_SECRET
    },
    drive: {
      key: process.env.DRIVE_KEY,
      secret: process.env.DRIVE_SECRET,
    },
    dropbox: {
      key: process.env.DROPBOX_KEY,
      secret: process.env.DROPBOX_SECRET
    }
  },
  server: {
    host: new URL(baseUrl).host, // the host including port e.g. localhost:3020
    protocol: new URL(baseUrl).protocol.replace(":","") // it should be http or https
  },
  filePath: '/tmp',
  secret: 'some-secret',
  debug: true
}

app.use(companion.app(uppyOptions))

// handle 404
app.use((req, res, next) => {
  return res.status(404).json({ message: 'Not Found' })
})

// handle server errors
app.use((err, req, res, next) => {
  console.error('\x1b[31m', err.stack, '\x1b[0m')
  res.status(err.status || 500).json({ message: err.message, error: err })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on ${baseUrl}`)
})

companion.socket(server, uppyOptions)
