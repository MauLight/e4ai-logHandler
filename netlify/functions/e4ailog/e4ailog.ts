// netlify/functions/log-event.js
import mongoose from 'mongoose'

export const handler = async (event, context) => {
  // Allow reusing the mongoose connection across invocations
  context.callbackWaitsForEmptyEventLoop = false

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  // Parse JSON body
  let data
  try {
    data = JSON.parse(event.body)
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload' }),
    }
  }

  // Basic validation
  const { user, user_id, path, timestamp } = data
  if (
    typeof user !== 'string' ||
    typeof user_id !== 'string' ||
    typeof path !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error:
          'Fields "user", "user_id", "path", and "timestamp" must be strings.',
      }),
    }
  }

  // Connect to MongoDB (URI stored in Netlify site’s ENV var MONGO_URI)
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    return {
      statusCode: 500,
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
        body: JSON.stringify({ error: 'Database connection failed.' }),
      }
    }
  }

  // Define schema & model (or reuse if already defined)
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

  // Create new log document
  let saved
  try {
    saved = await Log.create({ user, user_id, path, timestamp })
  } catch (saveErr) {
    console.error('Error saving log:', saveErr)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save log entry.' }),
    }
  }

  return {
    statusCode: 201,
    body: JSON.stringify(saved),
  }
}