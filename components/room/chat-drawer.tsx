"use client";

import * as React from "react";
import { Send, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserName: string;
  onSendMessage: (text: string) => void;
}

export function ChatDrawer({
  isOpen,
  onClose,
  messages,
  currentUserName,
  onSendMessage,
}: ChatDrawerProps) {
  const [input, setInput] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput("");
  };

  return (
    <div className="w-80 h-full border-l border-border/50 bg-card flex flex-col shadow-xl z-20 transition-all">
      {/* Chat Header */}
      <div className="flex h-12 items-center justify-between border-b border-border/40 px-3.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-indigo-400" />
          <span className="font-semibold text-xs tracking-tight">Interview Chat</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground/60 text-[11px] p-4">
            No messages yet. Send a note, question, or link!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentUserName;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground px-1">
                  <span className="font-medium text-foreground">{msg.sender}</span>
                  <span>&bull;</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div
                  className={`rounded-xl px-3 py-2 max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none border border-border/40"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-border/40 flex items-center gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type message..."
          className="h-9 text-xs rounded-lg bg-background"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!input.trim()}
          className="h-9 w-9 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
        >
          <Send className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
