import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { queueAction, setCacheData, getCacheData } from "@/lib/offlineQueue";

interface CreateCharacterFormProps {
  onCreated: (characterId: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const CreateCharacterForm = ({ onCreated, onCancel, submitLabel = "Create Character" }: CreateCharacterFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const online = useNetworkStatus();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!online) {
        const tempId = crypto.randomUUID();
        const newChar = {
          id: tempId,
          user_id: user!.id,
          name,
          description: description || null,
          portrait_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queueAction({
          table: "characters",
          operation: "insert",
          payload: { user_id: user!.id, name, description: description || null },
          tempId,
        });
        // Optimistically add to cache
        const cacheKey = `my-characters-${user!.id}`;
        const cached = getCacheData<any[]>(cacheKey) ?? [];
        setCacheData(cacheKey, [newChar, ...cached]);
        queryClient.setQueryData(["my-characters", user!.id], (old: any[]) =>
          old ? [newChar, ...old] : [newChar]
        );
        return newChar;
      }
      const { data, error } = await supabase
        .from("characters")
        .insert({ user_id: user!.id, name, description: description || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      }
      setName("");
      setDescription("");
      onCreated(data.id);
      if (!online) {
        toast({ title: "Character saved locally — will sync when online" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Character name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <div className="flex gap-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="flex-1 font-display"
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreateCharacterForm;
