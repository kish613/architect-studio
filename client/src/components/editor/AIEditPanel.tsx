import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScene } from "@/stores/use-scene";
import { aiEditScene } from "@/lib/api";
import { executeAIActions } from "@/lib/ai-edit-actions";
import { MessageSquare, Send, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "ai";
  text: string;
  actions?: Array<{ tool: string; args: Record<string, any> }>;
  status?: "pending" | "applied" | "cancelled";
}

export function AIEditPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { floorplanId } = useScene();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || !floorplanId || isLoading) return;
    const userMsg: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      const result = await aiEditScene(floorplanId, userMsg.text);
      const aiMsg: Message = {
        role: "ai",
        text: result.explanation,
        actions: result.actions,
        status: result.actions.length > 0 ? "pending" : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: err instanceof Error ? err.message : "Something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.actions) return;
    const { applied, skipped } = executeAIActions(msg.actions);
    setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, status: "applied" } : m)));
    toast({ title: "Changes applied", description: `${applied} action(s) applied${skipped ? `, ${skipped} skipped` : ""}` });
  };

  const handleCancel = (msgIndex: number) => {
    setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, status: "cancelled" } : m)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">AI Edit</h3>
      </div>
      <div ref={scrollRef} className="max-h-60 overflow-y-auto space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-white/30 italic">Try: &quot;Change walls to brick&quot; or &quot;Add a sofa to the living room&quot;</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-xs rounded-lg p-2 ${msg.role === "user" ? "bg-primary/20 text-white/80" : "bg-white/5 text-white/60"}`}>
            <p>{msg.text}</p>
            {msg.actions && msg.status === "pending" && (
              <div className="flex gap-1 mt-2">
                <Button size="sm" variant="default" className="h-6 text-xs" onClick={() => handleApply(i)}>
                  <Check className="w-3 h-3 mr-1" /> Apply
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleCancel(i)}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            )}
            {msg.status === "applied" && <span className="text-xs text-green-400 mt-1 block">Applied</span>}
            {msg.status === "cancelled" && <span className="text-xs text-white/30 mt-1 block">Cancelled</span>}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex gap-1">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe changes..."
          className="h-8 text-xs bg-white/5 border-white/10"
          disabled={isLoading || !floorplanId}
        />
        <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={isLoading || !input.trim()}>
          <Send className="w-3 h-3" />
        </Button>
      </form>
    </div>
  );
}
