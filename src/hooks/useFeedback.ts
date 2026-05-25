import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Feedback {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export function useFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["feedback", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Feedback[];
    },
    enabled: !!user?.id,
  });

  const createFeedback = useMutation({
    mutationFn: async (feedback: { type: string; subject: string; message: string }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          type: feedback.type,
          subject: feedback.subject,
          message: feedback.message,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast({
        title: "ส่งข้อเสนอแนะสำเร็จ",
        description: "ขอบคุณสำหรับความคิดเห็นของคุณ",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    feedbacks,
    isLoading,
    createFeedback: createFeedback.mutate,
    isCreating: createFeedback.isPending,
  };
}
