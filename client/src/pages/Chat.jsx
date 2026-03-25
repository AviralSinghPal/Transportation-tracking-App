import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageSquare, Search, User, Truck, Clapperboard, Users } from 'lucide-react';

const roleColors = { coordinator: 'var(--color-primary)', driver: 'var(--color-green)', passenger: 'var(--color-yellow)' };
const roleLabels = { coordinator: 'Coordinators', driver: 'Drivers', passenger: 'Passengers / Actors' };
const roleIcons = { coordinator: Clapperboard, driver: Truck, passenger: Users };

export default function Chat() {
  const { apiFetch, user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/chat/conversations'),
      apiFetch('/chat/contacts')
    ]).then(([convos, contactList]) => {
      setConversations(convos);
      setContacts(contactList);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (selectedUser && (msg.sender._id === selectedUser._id || msg.sender._id === user._id)) {
        setMessages(prev => [...prev, msg]);
      }
      apiFetch('/chat/conversations').then(setConversations).catch(() => {});
    };
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openChat(chatUser) {
    setSelectedUser(chatUser);
    try {
      const msgs = await apiFetch(`/chat/messages/${chatUser._id}`);
      setMessages(msgs);
    } catch (err) { console.error(err); }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    try {
      await apiFetch('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: selectedUser._id, message: newMessage.trim() })
      });
      setNewMessage('');
    } catch (err) { alert(err.message); }
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group contacts by role
  const groupedContacts = {};
  for (const c of filteredContacts) {
    if (!groupedContacts[c.role]) groupedContacts[c.role] = [];
    groupedContacts[c.role].push(c);
  }

  // Order: coordinator, driver, passenger
  const roleOrder = ['coordinator', 'driver', 'passenger'];

  return (
    <div className="page" style={{ maxWidth: 900, padding: 0 }}>
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: 'var(--color-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 300, borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Messages</h2>
            <div className="input-with-icon">
              <Search size={16} className="input-icon" />
              <input className="form-input form-input-icon" placeholder="Search contacts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ minHeight: 38 }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Recent conversations */}
            {conversations.length > 0 && !searchQuery && (
              <>
                <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Chats</div>
                {conversations.map(c => (
                  <div
                    key={c.user._id}
                    onClick={() => openChat(c.user)}
                    style={{ padding: '12px 16px', cursor: 'pointer', background: selectedUser?._id === c.user._id ? 'var(--color-primary-light)' : 'transparent', borderBottom: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: roleColors[c.user.role] || 'var(--color-gray)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {c.user.name?.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{c.user.name}</span>
                          <span style={{ fontSize: 10, color: roleColors[c.user.role], fontWeight: 700, textTransform: 'uppercase' }}>{c.user.role}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>
                      </div>
                      {c.unreadCount > 0 && (
                        <div style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--color-primary)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {c.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Contacts grouped by role */}
            {roleOrder.map(role => {
              const roleContacts = groupedContacts[role];
              if (!roleContacts || roleContacts.length === 0) return null;
              const RoleIcon = roleIcons[role] || User;
              return (
                <div key={role}>
                  <div style={{ padding: '12px 16px 6px', fontSize: 11, fontWeight: 700, color: roleColors[role], textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RoleIcon size={12} />
                    {roleLabels[role]} ({roleContacts.length})
                  </div>
                  {roleContacts.map(c => (
                    <div
                      key={c._id}
                      onClick={() => openChat(c)}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: roleColors[c.role] || 'var(--color-gray)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {c.name?.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                        {c.phone && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{c.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {filteredContacts.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                No contacts found
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedUser ? (
            <>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: roleColors[selectedUser.role] || 'var(--color-gray)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {selectedUser.name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedUser.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>{selectedUser.role}{selectedUser.phone ? ` · ${selectedUser.phone}` : ''}</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: 40 }}>
                    No messages yet. Say hello!
                  </div>
                )}
                {messages.map((m, i) => {
                  const isMe = m.sender?._id === user?._id || m.sender === user?._id;
                  return (
                    <div key={m._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isMe ? 'var(--color-primary)' : 'var(--color-gray-light)',
                        color: isMe ? 'white' : 'var(--color-text)',
                        fontSize: 14, lineHeight: 1.5
                      }}>
                        {m.message}
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div className="empty-state-icon"><MessageSquare size={28} /></div>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>Select a conversation</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Choose a contact to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
