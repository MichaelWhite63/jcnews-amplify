// Imported first in main.tsx: ES imports are evaluated before the importer's body, so
// configuring here guarantees generateClient() calls in App/exchangeClient see the config.
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'

Amplify.configure(outputs)
