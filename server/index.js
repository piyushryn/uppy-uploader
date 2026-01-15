const express = require('express')
const companion = require('@uppy/companion')
const bodyParser = require('body-parser')
const session = require('express-session')
const ImageKit = require('imagekit')
const path = require('path')
require('dotenv').config()

/* -------------------------------------------------
   PORT 
-------------------------------------------------- */
const PORT = process.env.PORT || 3000

/* -------------------------------------------------
   BASE URL (HTTPS externally, HTTP internally)
-------------------------------------------------- */
const isRailway = !!process.env.RAILWAY_PUBLIC_DOMAIN

const baseUrl = isRailway
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`

/* -------------------------------------------------
   ENV VALIDATION
-------------------------------------------------- */
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

/* -------------------------------------------------
   IMAGEKIT INIT
-------------------------------------------------- */
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
})

/* -------------------------------------------------
   EXPRESS APP
-------------------------------------------------- */
const app = express()

// REQUIRED for Railway (sessions + websockets)
app.set('trust proxy', 1)

app.set('view engine', 'ejs')

app.use('/dist', express.static(path.join(__dirname, '..', 'dist')))
app.use(bodyParser.json())

app.use(
  session({
    secret: 'some-secret',
    resave: false,
    saveUninitialized: true
  })
)

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Origin, Content-Type, Accept'
  )
  next()
})

/* -------------------------------------------------
   ROUTES
-------------------------------------------------- */
app.get('/auth', (req, res) => {
  res.send(imagekit.getAuthenticationParameters())
})

app.get('/', (req, res) => {
  res.render(path.join(__dirname, '..', 'client', 'index'), {
    IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
    SERVER_BASE_URL: baseUrl
  })
})

/* -------------------------------------------------
   UPPY COMPANION CONFIG
-------------------------------------------------- */
const uppyOptions = {
  providerOptions: {
    facebook: {
      key: process.env.FACEBOOK_KEY,
      secret: process.env.FACEBOOK_SECRET
    },
    drive: {
      key: process.env.DRIVE_KEY,
      secret: process.env.DRIVE_SECRET
    },
    dropbox: {
      key: process.env.DROPBOX_KEY,
      secret: process.env.DROPBOX_SECRET
    }
  },

  server: {
    host: isRailway
      ? process.env.RAILWAY_PUBLIC_DOMAIN
      : `localhost:${PORT}`,
    protocol: isRailway ? 'https' : 'http'
  },

  filePath: '/tmp',
  secret: 'some-secret',
  debug: true
}

// Companion middleware
app.use(companion.app(uppyOptions))

/* -------------------------------------------------
   ERROR HANDLING
-------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message,
    error: err
  })
})

/* -------------------------------------------------
   START SERVER
-------------------------------------------------- */
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at ${baseUrl}`)
})

// Companion WebSocket support
companion.socket(server, uppyOptions)
