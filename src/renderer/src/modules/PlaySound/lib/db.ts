// src/renderer/src/modules/PlaySound/lib/db.ts
import { v4 as uuidv4 } from 'uuid'

const DB_NAME = 'IO_AudioCache_DB'
const DB_VERSION = 1
const AUDIO_STORE_NAME = 'audioSnippets'

interface AudioRecord {
  id: string // Unique ID for this audio entry (e.g., UUID)
  originalFileName: string
  mimeType: string
  audioBuffer: ArrayBuffer // Store the raw audio data
  dateAdded: Date
}

let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance)
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error('[DB] Error opening IndexedDB:', (event.target as IDBRequest).error)
      reject(new Error('Error opening IndexedDB'))
    }

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result
      console.debug('[DB] IndexedDB opened successfully.')
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      console.debug('[DB] IndexedDB upgrade needed or first time setup.')
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        const store = db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' })
        store.createIndex('originalFileName', 'originalFileName', { unique: false })
        console.debug(`[DB] Object store "${AUDIO_STORE_NAME}" created.`)
      }
    }
  })
}

export async function addAudioToDB(
  originalFileName: string,
  mimeType: string,
  audioBuffer: ArrayBuffer
): Promise<string> {
  const db = await openDB()
  const audioId = uuidv4()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(AUDIO_STORE_NAME)
    const record: AudioRecord = {
      id: audioId,
      originalFileName,
      mimeType,
      audioBuffer,
      dateAdded: new Date()
    }
    const request = store.put(record)

    request.onsuccess = () => {
      console.debug('[DB] Audio added/updated successfully:', audioId, originalFileName)
      resolve(audioId)
    }
    request.onerror = (event) => {
      console.error('[DB] Error adding/updating audio:', (event.target as IDBRequest).error)
      reject(new Error('Error adding audio to DB'))
    }
  })
}

export async function getAudioBufferFromDB(audioId: string): Promise<AudioRecord | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    if (!audioId) {
      console.warn('[DB] getAudioBufferFromDB called with no audioId.')
      return resolve(undefined)
    }
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readonly')
    const store = transaction.objectStore(AUDIO_STORE_NAME)
    const request = store.get(audioId)

    request.onsuccess = () => {
      resolve(request.result as AudioRecord | undefined)
    }
    request.onerror = (event) => {
      console.error('[DB] Error fetching audio:', (event.target as IDBRequest).error)
      reject(new Error('Error fetching audio from DB'))
    }
  })
}

export async function getAllAudioInfoFromDB(): Promise<AudioRecord[]> {
  // Return full AudioRecord for flexibility
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readonly')
    const store = transaction.objectStore(AUDIO_STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const allRecords = request.result as AudioRecord[]
      // Caller can map to Pick<...> if needed
      resolve(allRecords)
    }
    request.onerror = (event) => {
      console.error('[DB] Error fetching all audio info:', (event.target as IDBRequest).error)
      reject(new Error('Error fetching all audio info'))
    }
  })
}

export async function deleteAudioFromDB(audioId: string): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(AUDIO_STORE_NAME)
    const request = store.delete(audioId)

    request.onsuccess = () => {
      console.debug('[DB] Audio deleted successfully:', audioId)
      resolve()
    }
    request.onerror = (event) => {
      console.error('[DB] Error deleting audio:', (event.target as IDBRequest).error)
      reject(new Error('Error deleting audio from DB'))
    }
  })
}

export async function clearAllAudioFromDB(): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(AUDIO_STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => {
      console.debug('[DB] All audio cleared successfully.')
      resolve()
    }
    request.onerror = (event) => {
      console.error('[DB] Error clearing audio store:', (event.target as IDBRequest).error)
      reject(new Error('Error clearing audio store'))
    }
  })
}

// Initialize DB connection when module loads (or app starts if this is imported early)
openDB().catch((err) => console.error('[DB] Failed to initialize Audio DB on module load:', err))
