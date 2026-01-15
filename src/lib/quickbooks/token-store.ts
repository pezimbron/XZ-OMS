// Simple in-memory token store
// TODO: Replace with database storage for production
let storedToken: any = null

export const tokenStore = {
  set: (token: any) => {
    storedToken = token
    console.log('Token stored:', token ? 'Yes' : 'No')
  },
  
  get: () => {
    console.log('Token retrieved:', storedToken ? 'Yes' : 'No')
    return storedToken
  },
  
  clear: () => {
    storedToken = null
  },
}
