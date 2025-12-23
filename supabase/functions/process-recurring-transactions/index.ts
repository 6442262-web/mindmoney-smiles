import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecurringTransaction {
  id: string
  user_id: string
  account_id: string
  type: string
  category: string
  description: string | null
  amount: number
  frequency: string
  next_date: string
  priority: number
  is_active: boolean
}

function calculateNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate)
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      date.setMonth(date.getMonth() + 1)
  }
  
  return date.toISOString().split('T')[0]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const today = new Date().toISOString().split('T')[0]
    
    console.log('Processing recurring transactions for date:', today)

    // Get all active recurring transactions that are due
    const { data: recurringTransactions, error: fetchError } = await supabaseClient
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_date', today)

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError)
      throw fetchError
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
      console.log('No recurring transactions to process')
      return new Response(
        JSON.stringify({ message: 'No recurring transactions to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${recurringTransactions.length} recurring transactions to process`)

    let processedCount = 0
    let errorCount = 0

    // Process each recurring transaction
    for (const recurring of recurringTransactions as RecurringTransaction[]) {
      try {
        console.log(`Processing recurring transaction ${recurring.id} for user ${recurring.user_id}`)

        // Create the transaction
        const { data: transaction, error: transactionError } = await supabaseClient
          .from('transactions')
          .insert({
            user_id: recurring.user_id,
            account_id: recurring.account_id,
            type: recurring.type,
            category: recurring.category,
            description: recurring.description,
            amount: recurring.amount,
            date: today,
            priority: recurring.priority,
            is_recurring: true,
          })
          .select()
          .single()

        if (transactionError) {
          console.error(`Error creating transaction for ${recurring.id}:`, transactionError)
          errorCount++
          
          // Create failed execution record
          await supabaseClient
            .from('recurring_transaction_executions')
            .insert({
              recurring_transaction_id: recurring.id,
              user_id: recurring.user_id,
              execution_date: today,
              amount: recurring.amount,
              status: 'failed',
              notes: `Error: ${transactionError.message}`,
            })
          
          continue
        }

        console.log(`Created transaction ${transaction.id}`)

        // Create execution record
        const { error: executionError } = await supabaseClient
          .from('recurring_transaction_executions')
          .insert({
            recurring_transaction_id: recurring.id,
            user_id: recurring.user_id,
            transaction_id: transaction.id,
            execution_date: today,
            amount: recurring.amount,
            status: 'completed',
            notes: 'สร้างรายการอัตโนมัติสำเร็จ',
          })

        if (executionError) {
          console.error(`Error creating execution record for ${recurring.id}:`, executionError)
        }

        // Calculate next date
        const nextDate = calculateNextDate(recurring.next_date, recurring.frequency)

        // Update recurring transaction with new next_date
        const { error: updateError } = await supabaseClient
          .from('recurring_transactions')
          .update({ next_date: nextDate })
          .eq('id', recurring.id)

        if (updateError) {
          console.error(`Error updating recurring transaction ${recurring.id}:`, updateError)
          errorCount++
        } else {
          console.log(`Updated next_date for ${recurring.id} to ${nextDate}`)
          processedCount++
        }
      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.id}:`, error)
        errorCount++
      }
    }

    console.log(`Processing complete. Success: ${processedCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        processed: processedCount,
        errors: errorCount,
        total: recurringTransactions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in process-recurring-transactions:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
