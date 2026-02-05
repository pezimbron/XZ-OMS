import fs from 'fs'
import path from 'path'

// File-based token storage that persists across server restarts
const TOKEN_FILE_PATH = path.join(process.cwd(), '.quickbooks-token.json')

export const tokenStore = {
  set: (token: any) => {
    try {
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(token, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error storing token:', error)
    }
  },

  get: () => {
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        const tokenData = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8')
        const token = JSON.parse(tokenData)
        return token
      }
      return null
    } catch (error) {
      console.error('Error retrieving token:', error)
      return null
    }
  },
  
  clear: () => {
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        fs.unlinkSync(TOKEN_FILE_PATH)
      }
    } catch (error) {
      console.error('Error clearing token:', error)
    }
  },
}
