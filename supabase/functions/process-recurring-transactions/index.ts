import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function calculateNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate)
  switch (frequency) {
    case 'daily': date.setDate(date.getDate() + 1); break
    case 'weekly': date.setDate(date.getDate() + 7); break
    case 'biweekly': date.setDate(date.getDate() + 14); break
    case 'monthly': date.setMonth(date.getMonth() + 1); break
    case 'quarterly': date.setMonth(date.getMonth() + 3); break
    case 'yearly': date.setFullYear(date.getFullYear() + 1); break
    default: date.setMonth(date.getMonth() + 1)
  }
  return date.toISOString().split('T')[0]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Use Thailand timezone for "today"
    const now = new Date()
    const thaiOffset = 7 * 60 // UTC+7
    const thaiTime = new Date(now.getTime() + (thaiOffset + now.getTimezoneOffset()) * 60000)
    const today = thaiTime.toISOString().split('T')[0]

    console.log('Processing recurring transactions for date (Thai time):', today)

    const { data: recurringTransactions, error: fetchError } = await supabaseClient
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution', today)

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

    for (const recurring of recurringTransactions) {
      try {
        console.log(`Processing recurring transaction ${recurring.id} for user ${recurring.user_id}`)

        const { data: transaction, error: transactionError } = await supabaseClient
          .from('transactions')
          .insert({
            user_id: recurring.user_id,
            account_id: recurring.account_id,
            type: recurring.type,
            category_id: recurring.category_id,
            description: recurring.description,
            amount: recurring.amount,
            date: today,
            recurring_id: recurring.id,
          })
          .select()
          .single()

        if (transactionError) {
          console.error(`Error creating transaction for ${recurring.id}:`, transactionError)
          errorCount++

          await supabaseClient
            .from('recurring_executions')
            .insert({
              recurring_id: recurring.id,
              execution_date: today,
              status: 'failed',
              error_message: transactionError.message,
            })

          continue
        }

        console.log(`Created transaction ${transaction.id}`)

        await supabaseClient
          .from('recurring_executions')
          .insert({
            recurring_id: recurring.id,
            transaction_id: transaction.id,
            execution_date: today,
            status: 'success',
          })

        const nextDate = calculateNextDate(recurring.next_execution, recurring.frequency)

        const { error: updateError } = await supabaseClient
          .from('recurring_transactions')
          .update({ next_execution: nextDate, last_execution: today })
          .eq('id', recurring.id)

        if (updateError) {
          console.error(`Error updating recurring transaction ${recurring.id}:`, updateError)
          errorCount++
        } else {
          console.log(`Updated next_execution for ${recurring.id} to ${nextDate}`)
          processedCount++
        }
      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.id}:`, error)
        errorCount++
      }
    }

    console.log(`Processing complete. Success: ${processedCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({ message: 'Processing complete', processed: processedCount, errors: errorCount, total: recurringTransactions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in process-recurring-transactions:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
