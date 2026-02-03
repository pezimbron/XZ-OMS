import { NextRequest, NextResponse } from 'next/server'
import { quickbooksClient } from '@/lib/quickbooks/client'
import { getPayload } from 'payload'
import config from '@payload-config'

interface SyncResult {
  expenseIndex: number
  quickbooksId: string
  previousStatus: string
  newStatus: string
  balance: number
  totalAmt: number
  updated: boolean
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { jobId, expenseId } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Get the job with external expenses
    const job = await payload.findByID({
      collection: 'jobs',
      id: jobId,
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const expenses = job.externalExpenses || []

    // Filter to expenses with QuickBooks IDs
    const expensesToSync = expenses
      .map((expense: any, index: number) => ({ ...expense, _index: index }))
      .filter((expense: any) => {
        // If expenseId specified, only sync that one
        if (expenseId) {
          return expense.id === expenseId && expense.quickbooksId
        }
        return expense.quickbooksId
      })

    if (expensesToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expenses with QuickBooks IDs to sync',
        syncedCount: 0,
        results: [],
      })
    }

    const results: SyncResult[] = []
    let updatedCount = 0

    // Sync each expense with QuickBooks
    for (const expense of expensesToSync) {
      try {
        // Get bill from QuickBooks
        const billResponse = await quickbooksClient.getBill(expense.quickbooksId)
        const bill = billResponse?.Bill

        if (!bill) {
          results.push({
            expenseIndex: expense._index,
            quickbooksId: expense.quickbooksId,
            previousStatus: expense.paymentStatus,
            newStatus: expense.paymentStatus,
            balance: 0,
            totalAmt: 0,
            updated: false,
            error: 'Bill not found in QuickBooks',
          })
          continue
        }

        // Determine payment status from bill balance
        let newStatus: 'unpaid' | 'pending' | 'paid' = 'unpaid'
        if (bill.Balance === 0) {
          newStatus = 'paid'
        } else if (bill.Balance < bill.TotalAmt) {
          newStatus = 'pending'
        }

        const updated = expense.paymentStatus !== newStatus

        results.push({
          expenseIndex: expense._index,
          quickbooksId: expense.quickbooksId,
          previousStatus: expense.paymentStatus,
          newStatus,
          balance: bill.Balance,
          totalAmt: bill.TotalAmt,
          updated,
        })

        // Update expense in array if status changed
        // Cast to any to avoid TypeScript errors until types are regenerated
        const expenseToUpdate = expenses[expense._index] as any
        if (updated) {
          expenseToUpdate.paymentStatus = newStatus
          expenseToUpdate.quickbooksSyncedAt = new Date().toISOString()

          // If paid, also set paidDate if not already set
          if (newStatus === 'paid' && !expenseToUpdate.paidDate) {
            expenseToUpdate.paidDate = new Date().toISOString()
          }

          updatedCount++
        } else {
          // Update sync timestamp even if status didn't change
          expenseToUpdate.quickbooksSyncedAt = new Date().toISOString()
        }

      } catch (err: any) {
        console.error(`Error syncing expense ${expense.id}:`, err)
        results.push({
          expenseIndex: expense._index,
          quickbooksId: expense.quickbooksId,
          previousStatus: expense.paymentStatus,
          newStatus: expense.paymentStatus,
          balance: 0,
          totalAmt: 0,
          updated: false,
          error: err.message || 'Failed to fetch bill from QuickBooks',
        })
      }
    }

    // Update job with modified expenses
    await payload.update({
      collection: 'jobs',
      id: jobId,
      data: {
        externalExpenses: expenses,
      },
    })

    return NextResponse.json({
      success: true,
      message: updatedCount > 0
        ? `Synced ${expensesToSync.length} expense(s), ${updatedCount} status update(s)`
        : `Synced ${expensesToSync.length} expense(s), no status changes`,
      syncedCount: expensesToSync.length,
      updatedCount,
      results,
    })

  } catch (error: any) {
    console.error('QuickBooks bill sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync bill status from QuickBooks' },
      { status: 500 }
    )
  }
}
