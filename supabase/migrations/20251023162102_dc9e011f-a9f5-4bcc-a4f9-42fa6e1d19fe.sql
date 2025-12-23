-- Create table for recurring transaction execution history
CREATE TABLE public.recurring_transaction_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_transaction_id UUID NOT NULL,
  user_id UUID NOT NULL,
  transaction_id UUID,
  execution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recurring_transaction_executions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own execution history" 
ON public.recurring_transaction_executions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own execution history" 
ON public.recurring_transaction_executions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own execution history" 
ON public.recurring_transaction_executions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own execution history" 
ON public.recurring_transaction_executions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recurring_transaction_executions_updated_at
BEFORE UPDATE ON public.recurring_transaction_executions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_recurring_transaction_executions_user_id 
ON public.recurring_transaction_executions(user_id);

CREATE INDEX idx_recurring_transaction_executions_recurring_id 
ON public.recurring_transaction_executions(recurring_transaction_id);

CREATE INDEX idx_recurring_transaction_executions_date 
ON public.recurring_transaction_executions(execution_date DESC);