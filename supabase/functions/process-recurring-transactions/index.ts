import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

// preferredDay: วันที่ตั้งใจให้ยิงประจำเดือน (จาก day_of_month) — clamp ไม่ให้เกินวันสุดท้ายของเดือนเป้าหมาย
// เดิมใช้ date.setMonth(+1) ตรง ๆ ทำให้ 31 ม.ค. กลายเป็น 3 มี.ค. (ข้าม ก.พ. ถาวร)
function calculateNextDate(currentDate: string, frequency: string, preferredDay?: number | null): string {
  const [y, m, d] = currentDate.split('-').map(Number)

  const addDays = (days: number): string => {
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() + days)
    return dt.toISOString().split('T')[0]
  }

  const addMonths = (months: number): string => {
    const totalMonth = (m - 1) + months
    const year = y + Math.floor(totalMonth / 12)
    const monthIndex = totalMonth % 12
    const day = Math.min(preferredDay || d, daysInMonth(year, monthIndex))
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  switch (frequency) {
    case 'daily': return addDays(1)
    case 'weekly': return addDays(7)
    case 'biweekly': return addDays(14)
    case 'monthly': return addMonths(1)
    case 'quarterly': return addMonths(3)
    case 'yearly': return addMonths(12)
    default: return addMonths(1)
  }
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

        // หมดอายุตาม end_date แล้ว → ปิดการใช้งานและข้าม (เดิมไม่เช็ค ทำให้ยิงต่อไปเรื่อย ๆ)
        if (recurring.end_date && recurring.end_date < today) {
          console.log(`Recurring ${recurring.id} passed end_date ${recurring.end_date}, deactivating`)
          await supabaseClient
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id)
          continue
        }

        // กันยิงซ้ำ: ถ้าวันนี้มี execution สำเร็จแล้ว (เช่นรอบก่อน insert ผ่านแต่ update next_execution ล้ม)
        // ให้ข้ามการสร้างธุรกรรม แต่ยังเลื่อน next_execution ให้ถูกต้อง (self-healing)
        const { data: existingExec } = await supabaseClient
          .from('recurring_executions')
          .select('id')
          .eq('recurring_id', recurring.id)
          .eq('execution_date', today)
          .eq('status', 'success')
          .limit(1)

        if (existingExec && existingExec.length > 0) {
          console.log(`Recurring ${recurring.id} already executed today, advancing next_execution only`)
          const healedNext = calculateNextDate(recurring.next_execution, recurring.frequency, recurring.day_of_month)
          await supabaseClient
            .from('recurring_transactions')
            .update({ next_execution: healedNext, last_execution: today })
            .eq('id', recurring.id)
          continue
        }

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

        const nextDate = calculateNextDate(recurring.next_execution, recurring.frequency, recurring.day_of_month)

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
