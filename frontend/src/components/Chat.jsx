import { useEffect, useState, useRef } from 'react';
import { api, API_BASE_URL } from '../api';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

export default function Chat({ reservationId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const { user } = useAuth();
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Fetch initial messages
    api.chat.getHistory(reservationId).then(setMessages).catch(console.error);

    const token = localStorage.getItem('token');
    const socket = io(API_BASE_URL, {
      auth: { token },
      withCredentials: true
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_reservation', reservationId);
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [reservationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socketRef.current?.emit('send_message', { reservationId, content: text });
    setText('');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl flex flex-col z-[100] animate-slide-left border-l border-border">
      <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-text">Reservation Chat</h3>
        <button onClick={onClose} className="text-subtle hover:text-red-500 font-medium">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {messages.length === 0 && <p className="text-center text-subtle text-sm">No messages yet. Send a message to coordinate pickup.</p>}
        {messages.map(m => {
          const isMe = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-muted mb-1 px-1">{m.sender_name}</span>
              <div className={`px-3 py-2 max-w-[85%] text-sm shadow-sm ${isMe ? 'bg-accent text-white rounded-2xl rounded-br-sm' : 'bg-white border border-border text-text rounded-2xl rounded-bl-sm'}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-4 border-t border-border bg-white flex gap-2">
        <input 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="Type a message..."
          className="input-field flex-1 !py-2 !rounded-xl"
        />
        <button type="submit" className="btn-primary !py-2 !px-4 !rounded-xl">Send</button>
      </form>
    </div>
  );
}
