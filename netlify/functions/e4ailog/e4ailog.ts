// netlify/functions/log-event.js

const mongoose = require('mongoose')

exports.handler = async (event, context) => {
  // Allow connection reuse
  context.callbackWaitsForEmptyEventLoop = false

  // Common CORS headers to include on every response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',                 // or replace '*' with your React app’s origin
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // 1) Handle CORS preflight request (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    }
  }

  // 2) Only allow POST from here onward
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  // 3) Parse JSON body
  let data
  try {
    data = JSON.parse(event.body)
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON payload' }),
    }
  }

  const { user, user_id, path, timestamp } = data
  // 4) Validate fields
  if (
    typeof user !== 'string' ||
    typeof user_id !== 'string' ||
    typeof path !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return {
      statusCode: 400,
      headers: corsHeaders,
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
      headers: corsHeaders,
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
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Database connection failed.' }),
      }
    }
  }

  // 6) Define schema & model (or reuse if already registered)
  const logSchema = new mongoose.Schema(
    {
      user: { type: String, required: true },
      user_id: { type: String, required: true },
      path: { type: String, required: true },
      timestamp: { type: String, required: true },
    },
    { timestamps: true }
  )
  const Log = mongoose.models.Log || mongoose.model('Log', logSchema, 'logs')

  // 7) Save log entry
  try {
    const saved = await Log.create({ user, user_id, path, timestamp })
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(saved),
    }
  } catch (saveErr) {
    console.error('Error saving log entry:', saveErr)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to write log entry.' }),
    }
  }
}