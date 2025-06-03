// netlify/functions/log-event.js
const mongoose = require('mongoose')

exports.handler = async (event, context) => {
  // 1) Let Netlify reuse the Mongoose connection across invocations
  context.callbackWaitsForEmptyEventLoop = false

  // 2) Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',                // or your specific origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    }
  }

  // 3) Reject any method other than POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  // 4) Parse JSON body
  let data
  try {
    data = JSON.parse(event.body)
  } catch {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid JSON payload' }),
    }
  }

  const { user, user_id, path, timestamp } = data
  if (
    typeof user !== 'string' ||
    typeof user_id !== 'string' ||
    typeof path !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error:
          'Fields "user", "user_id", "path", and "timestamp" must be strings.',
      }),
    }
  }

  // 5) Connect to MongoDB
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'MONGO_URI is not defined.' }),
    }
  }

  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri)
    } catch (connErr) {
      console.error('MongoDB connection error:', connErr)
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Database connection failed.' }),
      }
    }
  }

  // 6) Define schema/model (or reuse if already exists)
  const logSchema = new mongoose.Schema(
    {
      user: { type: String, required: true },
      user_id: { type: String, required: true },
      path: { type: String, required: true },
      timestamp: { type: String, required: true },
    },
    { timestamps: true }
  )
  const Log = mongoose.models.Log || mongoose.model('Log', logSchema)

  // 7) Save document
  try {
    const saved = await Log.create({ user, user_id, path, timestamp })
    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(saved),
    }
  } catch (saveErr) {
    console.error('Error saving log:', saveErr)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to write log entry.' }),
    }
  }
}