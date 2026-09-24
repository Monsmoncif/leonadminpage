"use client";

import { useState } from "react";
import { Search, Plus, Send, Phone, Video, MoreHorizontal, Image, Paperclip, Smile } from "lucide-react";
import { messageContacts, chatMessages } from "@/data/mock";

export default function MessagesPage() {
  const [selectedContact, setSelectedContact] = useState(3);
  const [message, setMessage] = useState("");

  const activeContact = messageContacts.find((c) => c.id === selectedContact) || messageContacts[0];

  return (
    <div className="grid grid-cols-12 gap-0 h-[calc(100vh-130px)] bg-card rounded-2xl border border-border overflow-hidden">
      {/* Contact List */}
      <div className="col-span-12 lg:col-span-4 border-r border-border flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="text" placeholder="Search for messages" className="w-full text-sm border border-border rounded-lg pl-9 pr-4 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20" />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
            <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-muted hover:bg-gray-50 transition-colors flex-shrink-0">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Contacts */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Today (5)</p>
          </div>
          {messageContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${
                selectedContact === contact.id
                  ? "bg-brand/5 border-r-2 border-r-brand"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-text-secondary">
                  {contact.name.split(" ").map((n) => n[0]).join("")}
                </div>
                {contact.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {contact.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className={`text-sm truncate ${contact.unread > 0 ? "font-bold text-text-primary" : "font-medium text-text-primary"}`}>
                    {contact.name}
                  </p>
                  <span className="text-[10px] text-text-muted flex-shrink-0 ml-2">{contact.time}</span>
                </div>
                <p className="text-xs text-text-muted truncate">{contact.lastMessage}</p>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 mt-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Yesterday (3)</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="col-span-12 lg:col-span-8 flex flex-col">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-text-secondary">
              {activeContact.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{activeContact.name}</p>
              <p className="text-xs text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-success rounded-full" /> Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-muted hover:bg-gray-50 transition-colors">
              <Phone size={16} />
            </button>
            <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-muted hover:bg-gray-50 transition-colors">
              <Video size={16} />
            </button>
            <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-muted hover:bg-gray-50 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
          {/* Date Separator */}
          <div className="flex items-center justify-center">
            <span className="bg-gray-100 text-text-muted text-xs font-medium px-3 py-1 rounded-full">Today</span>
          </div>

          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[65%] ${msg.isMe ? "order-2" : ""}`}>
                {!msg.isMe && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[8px] font-bold text-text-secondary">
                      {msg.sender.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-xs font-medium text-text-primary">{msg.sender}</span>
                    <span className="text-[10px] text-text-muted">{msg.time}</span>
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.isMe
                    ? "bg-brand text-white rounded-br-md"
                    : "bg-gray-100 text-text-primary rounded-bl-md"
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  {msg.hasImage && (
                    <div className="mt-2 w-48 h-32 bg-gray-200 rounded-xl flex items-center justify-center text-4xl">
                      🚗
                    </div>
                  )}
                </div>
                {msg.isMe && (
                  <p className="text-[10px] text-text-muted text-right mt-1">{msg.time}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-text-muted transition-colors">
                <Image size={18} />
              </button>
              <button className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-text-muted transition-colors">
                <Paperclip size={18} />
              </button>
              <button className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-text-muted transition-colors">
                <Smile size={18} />
              </button>
            </div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm border border-border rounded-xl px-4 py-2.5 bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button className="w-10 h-10 bg-brand hover:bg-brand-dark rounded-xl flex items-center justify-center text-white transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
