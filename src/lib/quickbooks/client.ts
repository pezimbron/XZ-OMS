import OAuthClient from 'intuit-oauth'
import { tokenStore } from './token-store'

interface QuickBooksConfig {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
  redirectUri: string
}

class QuickBooksClient {
  private oauthClient: OAuthClient
  private config: QuickBooksConfig

  constructor() {
    this.config = {
      clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
      environment: (process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SERVER_URL}/api/quickbooks/callback`,
    }

    this.oauthClient = new OAuthClient({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      environment: this.config.environment,
      redirectUri: this.config.redirectUri,
    })
  }

  private loadToken() {
    const token = tokenStore.get()
    if (token) {
      this.oauthClient.setToken(token)
    }
    return token
  }

  getAuthUri() {
    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
      state: 'testState',
    })
  }

  async createToken(url: string) {
    try {
      const authResponse = await this.oauthClient.createToken(url)
      return authResponse.token
    } catch (error) {
      console.error('Error creating token:', error)
      throw error
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      this.oauthClient.setToken({
        refresh_token: refreshToken,
      } as any)
      const authResponse = await this.oauthClient.refresh()
      return authResponse.token
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

  setToken(token: any) {
    this.oauthClient.setToken(token)
  }

  getToken() {
    return this.oauthClient.getToken()
  }

  async makeApiCall(endpoint: string, method: string = 'GET', body?: any) {
    try {
      // Load token from store before making API call
      const storedToken = this.loadToken()
      if (!storedToken) {
        throw new Error('No QuickBooks token available. Please authenticate first.')
      }

      const token = this.oauthClient.getToken()
      const companyId = token.realmId
      const baseUrl = this.oauthClient.environment === 'sandbox' 
        ? 'https://sandbox-quickbooks.api.intuit.com' 
        : 'https://quickbooks.api.intuit.com'
      
      // Add minorversion parameter as required by QuickBooks API
      const separator = endpoint.includes('?') ? '&' : '?'
      const url = `${baseUrl}/v3/company/${companyId}/${endpoint}${separator}minorversion=65`

      console.log('QuickBooks API Request:', {
        url,
        method,
        body: body
      })

      // Use axios directly for better control
      const axios = require('axios')
      const response = await axios({
        method: method,
        url: url,
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        data: body,
      })

      console.log('QuickBooks API Response:', JSON.stringify(response.data, null, 2))
      return response.data
    } catch (error: any) {
      const errorDetail = error.response?.data || error.message
      console.error('QuickBooks API call error:', JSON.stringify(errorDetail, null, 2))
      throw error
    }
  }

  async createCustomer(customerData: {
    DisplayName: string
    PrimaryEmailAddr?: { Address: string }
    PrimaryPhone?: { FreeFormNumber: string }
    CompanyName?: string
    BillAddr?: {
      Line1?: string
      City?: string
      CountrySubDivisionCode?: string
      PostalCode?: string
    }
  }) {
    // Send customer data directly without wrapper
    return this.makeApiCall('customer', 'POST', customerData)
  }

  async updateCustomer(customerId: string, customerData: any) {
    // Send customer data directly without wrapper
    return this.makeApiCall(`customer?operation=update`, 'POST', { ...customerData, Id: customerId })
  }

  async getCustomer(customerId: string) {
    return this.makeApiCall(`customer/${customerId}`, 'GET')
  }

  async queryCustomers(query: string) {
    return this.makeApiCall(`query?query=${encodeURIComponent(query)}`, 'GET')
  }

  async createInvoice(invoiceData: any) {
    return this.makeApiCall('invoice', 'POST', invoiceData)
  }

  async getInvoice(invoiceId: string) {
    return this.makeApiCall(`invoice/${invoiceId}`, 'GET')
  }

  async voidInvoice(invoiceId: string) {
    // QuickBooks requires fetching the invoice first to get the SyncToken
    const invoice = await this.getInvoice(invoiceId)
    const voidData = {
      Id: invoiceId,
      SyncToken: invoice.Invoice.SyncToken,
      sparse: true,
      PrivateNote: 'Voided',
    }
    return this.makeApiCall('invoice?operation=void', 'POST', voidData)
  }

  async queryBills(vendorId: string, fromDate: string, toDate: string) {
    const query = `SELECT * FROM Bill WHERE VendorRef = '${vendorId}' AND TxnDate >= '${fromDate}' AND TxnDate <= '${toDate}' ORDER BY TxnDate DESC`
    return this.makeApiCall(`query?query=${encodeURIComponent(query)}`, 'GET')
  }

  async createBill(billData: any) {
    return this.makeApiCall('bill', 'POST', billData)
  }

  async getBill(billId: string) {
    return this.makeApiCall(`bill/${billId}`, 'GET')
  }

  isConnected() {
    const token = this.oauthClient.getToken()
    return token && token.access_token && !this.oauthClient.isAccessTokenValid()
  }
}

export const quickbooksClient = new QuickBooksClient()
