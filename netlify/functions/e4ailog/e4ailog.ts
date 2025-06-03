const mongoose = require('mongoose')

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

let isConnected = false

async function connectToDatabase(mongoUri: string) {
  if (isConnected) return
  await mongoose.connect(mongoUri, { maxPoolSize: 1, serverSelectionTimeoutMS: 5000 })
  isConnected = true
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  let data
  try {
    data = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON payload' }) }
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
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Fields "user", "user_id", "path", and "timestamp" must be strings.' }),
    }
  }

  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'MONGO_URI is not defined.' }) }
  }

  try {
    await connectToDatabase(mongoUri)
  } catch (connErr) {
    console.error('MongoDB connection error:', connErr)
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Database connection failed.' }) }
  }

  try {
    const saved = await Log.create({ user, user_id, path, timestamp })
    return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(saved) }
  } catch (saveErr) {
    console.error('Error saving log entry:', saveErr)
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to write log entry.' }) }
  }
}