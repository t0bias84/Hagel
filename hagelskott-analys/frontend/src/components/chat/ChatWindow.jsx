import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';

const ChatWindow = ({ 
  isOpen, 
  onClose, 
  recipient, 
  messages = [], 
  onSendMessage 
}) => {
  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Autoscroll till senaste meddelandet
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`
        fixed bottom-0 right-4 
        w-80 
        bg-dark-800
        rounded-t-lg 
        shadow-lg 
        border border-dark-700
        transition-all 
        duration-200 
        ${isMinimized ? 'h-12' : 'h-96'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-dark-700">
        <h3 className="text-sm font-semibold text-dark-50">
          {recipient.name}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-dark-200 hover:text-dark-50"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="text-dark-200 hover:text-dark-50"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages container */}
      {!isMinimized && (
        <>
          <div className="flex-1 p-4 overflow-y-auto h-72">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.isSender ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`
                      max-w-[70%] 
                      rounded-lg 
                      px-4 
                      py-2 
                      ${
                        msg.isSender
                          ? 'bg-dark-accent text-dark-50'
                          : 'bg-dark-700 text-dark-50'
                      }
                    `}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <span className="text-xs opacity-75 mt-1 block">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input form */}
          <form 
            onSubmit={handleSubmit}
            className="border-t border-dark-700 p-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Skriv ett meddelande..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-dark-700 bg-dark-700 text-dark-50 placeholder-dark-200 focus:outline-none focus:ring-2 focus:ring-dark-accent"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="p-2 rounded-lg bg-dark-accent text-dark-50 hover:bg-dark-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatWindow; 