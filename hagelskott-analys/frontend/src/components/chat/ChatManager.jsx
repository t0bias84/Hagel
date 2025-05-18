import React, { useState, useEffect, useContext } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AuthContext } from '@/contexts/AuthContext';
import ChatWindow from './ChatWindow';
import { MessageCircle, Users } from 'lucide-react';

const ChatManager = () => {
  const { user } = useContext(AuthContext);
  const [activeChats, setActiveChats] = useState([]);
  const [messages, setMessages] = useState({});
  const [showUserList, setShowUserList] = useState(false);
  const [users, setUsers] = useState([]);
  const { sendMessage, lastMessage, isConnected } = useWebSocket();

  // Fetch user list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.filter(u => u.username !== user.username));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Handle incoming messages from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'message') {
      const { from_user, to_user, content, timestamp } = lastMessage.data;
      
      setMessages(prev => ({
        ...prev,
        [from_user]: [
          ...(prev[from_user] || []),
          {
            content,
            timestamp,
            isSender: false
          }
        ]
      }));

      // Open chat window if not already open
      if (!activeChats.find(chat => chat.username === from_user)) {
        setActiveChats(prev => [...prev, {
          username: from_user,
          name: from_user,
          minimized: false
        }]);
      }
    }
  }, [lastMessage]);

  // Open new chat
  const openChat = (recipient) => {
    if (!activeChats.find(chat => chat.username === recipient.username)) {
      setActiveChats(prev => [...prev, {
        username: recipient.username,
        name: recipient.name || recipient.username,
        minimized: false
      }]);
      setShowUserList(false);
    }
  };

  // Close chat
  const closeChat = (username) => {
    setActiveChats(prev => prev.filter(chat => chat.username !== username));
  };

  // Send message
  const handleSendMessage = (recipientUsername, content) => {
    const messageData = {
      type: 'message',
      to_user: recipientUsername,
      content
    };

    sendMessage(messageData);

    // Update local message state
    setMessages(prev => ({
      ...prev,
      [recipientUsername]: [
        ...(prev[recipientUsername] || []),
        {
          content,
          timestamp: new Date().toISOString(),
          isSender: true
        }
      ]
    }));
  };

  if (!user) return null;

  return (
    <>
      {/* Chat button and user list */}
      <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-2">
        {showUserList && (
          <div className="bg-dark-800 border border-dark-700 rounded-lg shadow-lg p-4 mb-2 w-64">
            <h3 className="text-sm font-semibold mb-2 text-dark-50">
              Available users
            </h3>
            <div className="space-y-2">
              {users.map(u => (
                <button
                  key={u.username}
                  onClick={() => openChat(u)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-700 text-sm text-dark-200"
                >
                  {u.name || u.username}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <button
          onClick={() => setShowUserList(!showUserList)}
          className="bg-dark-accent hover:bg-dark-accent/90 text-dark-50 p-3 rounded-full shadow-lg flex items-center space-x-2"
        >
          {showUserList ? <Users size={20} /> : <MessageCircle size={20} />}
        </button>
      </div>

      {/* Active chat windows */}
      <div className="fixed bottom-20 right-4 flex items-end space-x-4">
        {activeChats.map((chat, index) => (
          <ChatWindow
            key={chat.username}
            isOpen={true}
            recipient={chat}
            messages={messages[chat.username] || []}
            onClose={() => closeChat(chat.username)}
            onSendMessage={(content) => handleSendMessage(chat.username, content)}
          />
        ))}
      </div>
    </>
  );
};

export default ChatManager; 