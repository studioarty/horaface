import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ArrowLeft, Check, CheckCheck, Mic, Trash2, Play, Pause, Volume2, Paperclip, Video, Phone, X } from 'lucide-react';
import { useProviderAuthStore } from '@/stores/useProviderAuthStore';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { playChatNotificationSound, playMessageSentSound } from '@/lib/audio';

interface ChatMessage {
  id: string;
  provider_id: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'provider' | 'manager';
  content: string;
  created_at: string;
  is_read: boolean;
}

function AudioPlayer({ src, isMe }: { src: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(err => console.error(err));
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[240px] max-w-[320px] pb-4">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button
        type="button"
        onClick={togglePlay}
        className={`size-9 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
          isMe 
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' 
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        }`}
      >
        {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleProgressChange}
          className={`w-full accent-emerald-400 h-1 rounded-lg cursor-pointer bg-slate-800/80 ${
            isMe ? 'accent-emerald-300' : 'accent-emerald-400'
          }`}
        />
        <div className="flex justify-between items-center text-[9.5px] text-slate-400/80 select-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <Volume2 className="size-4 text-slate-400 shrink-0" />
    </div>
  );
}

export default function ProviderChat() {
  const { user } = useProviderAuthStore();
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeContactRef = useRef<any>(null);
  const { toast } = useToast();

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // File Upload and Video Call States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [activeCallUrl, setActiveCallUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasMultipleChannels = user && (user.chatPermissionType === 'all' || user.chatPermissionType === 'custom');

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Initialize active contact if multiple channels are NOT allowed
  useEffect(() => {
    if (user) {
      if (!hasMultipleChannels) {
        setActiveContact({ id: user.id, name: 'Suporte Técnico & Gestão', isSupport: true });
      } else if (activeContact && activeContact.id === user.id && activeContact.isSupport) {
        // Clear active contact if channels are now enabled so the list is shown
        setActiveContact(null);
      }
    }
  }, [hasMultipleChannels, user]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/ogg' };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendAudioMessage(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Falha ao acessar microfone:', err);
      toast({
        variant: 'destructive',
        title: 'Microfone Bloqueado',
        description: 'Verifique se deu permissão de microfone no navegador.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const sendAudioMessage = async (base64Audio: string) => {
    if (!user || !activeContact) return;

    const activeChannelId = activeContact.isSupport 
      ? user.id 
      : [user.id, activeContact.id].sort().join('_');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      provider_id: activeChannelId,
      sender_id: user.id,
      sender_name: user.name,
      sender_type: 'provider',
      content: base64Audio,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setAllMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);
    playMessageSentSound();

    try {
      const { error, data } = await supabase.from('chat_messages').insert({
        provider_id: activeChannelId,
        sender_id: user.id,
        sender_name: user.name,
        sender_type: 'provider',
        content: base64Audio,
      }).select();

      if (error) throw error;
      if (data && data.length > 0) {
        setAllMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data[0] as ChatMessage) : m))
        );
      }
    } catch (err: any) {
      console.error('Erro ao enviar mensagem de áudio:', err);
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar áudio',
        description: 'Tente novamente.',
      });
      setAllMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeContact) return;

    setUploadingFile(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      let type: 'image' | 'video' | 'file' = 'file';
      const mime = file.type.toLowerCase();
      if (mime.startsWith('image/')) {
        type = 'image';
      } else if (mime.startsWith('video/')) {
        type = 'video';
      }

      const contentPayload = JSON.stringify({
        type,
        url: publicUrl,
        name: file.name,
        size: file.size,
      });

      const activeChannelId = activeContact.isSupport 
        ? user.id 
        : [user.id, activeContact.id].sort().join('_');

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        provider_id: activeChannelId,
        sender_id: user.id,
        sender_name: user.name,
        sender_type: 'provider',
        content: contentPayload,
        created_at: new Date().toISOString(),
        is_read: false,
      };

      setAllMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(scrollToBottom, 50);
      playMessageSentSound();

      const { error: insertError, data: insertData } = await supabase.from('chat_messages').insert({
        provider_id: activeChannelId,
        sender_id: user.id,
        sender_name: user.name,
        sender_type: 'provider',
        content: contentPayload,
      }).select();

      if (insertError) throw insertError;

      if (insertData && insertData.length > 0) {
        setAllMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (insertData[0] as ChatMessage) : m))
        );
      }

    } catch (err: any) {
      console.error('Erro ao enviar arquivo:', err);
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar arquivo',
        description: err.message || 'Tente novamente.',
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!user || !activeContact) return;

    const channelId = activeContact.isSupport 
      ? user.id 
      : [user.id, activeContact.id].sort().join('_');

    const callPayload = JSON.stringify({
      type: 'call',
      callType: type,
      url: `https://meet.jit.si/pontoface-call-${channelId}-${Date.now()}`,
      name: type === 'audio' ? 'Chamada de Áudio' : 'Chamada de Vídeo',
    });

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      provider_id: channelId,
      sender_id: user.id,
      sender_name: user.name,
      sender_type: 'provider',
      content: callPayload,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setAllMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);
    playMessageSentSound();

    try {
      const { error, data } = await supabase.from('chat_messages').insert({
        provider_id: channelId,
        sender_id: user.id,
        sender_name: user.name,
        sender_type: 'provider',
        content: callPayload,
      }).select();

      if (error) throw error;
      if (data && data.length > 0) {
        setAllMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data[0] as ChatMessage) : m))
        );
      }
    } catch (err) {
      console.error(`Erro ao iniciar chamada de ${type === 'audio' ? 'áudio' : 'vídeo'}:`, err);
      setAllMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const renderAttachment = (data: any) => {
    if (data.type === 'image') {
      return (
        <div className="pb-3 pr-2">
          <img
            src={data.url}
            alt={data.name}
            onClick={() => setPreviewImageUrl(data.url)}
            className="max-w-full max-h-[220px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-800/20"
          />
          <p className="text-[10px] text-slate-450 mt-1 truncate max-w-[200px]">{data.name}</p>
        </div>
      );
    }
    
    if (data.type === 'video') {
      return (
        <div className="pb-3 pr-2 min-w-[240px] max-w-[280px]">
          <video
            src={data.url}
            controls
            className="w-full rounded-lg max-h-[220px] object-cover bg-slate-900 border border-slate-800/20"
          />
          <p className="text-[10px] text-slate-450 mt-1 truncate max-w-[240px]">{data.name}</p>
        </div>
      );
    }
    
    if (data.type === 'call') {
      const isAudio = data.callType === 'audio';
      return (
        <div className="py-2.5 px-2 min-w-[240px] max-w-[285px] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse">
              <span className="text-lg">{isAudio ? '📞' : '📹'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-[12.5px] font-bold text-slate-100 leading-none">
                {isAudio ? 'Chamada de Áudio' : 'Chamada de Vídeo'}
              </h5>
              <p className="text-[10px] text-emerald-400 mt-1.5 font-semibold leading-none">
                {isAudio ? 'Conexão de voz pronta' : 'Sala virtual pronta'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const displayName = encodeURIComponent(user ? user.name : 'Prestador');
              const params = `#config.prejoinConfig.enabled=false&config.disableDeepLinking=true&userInfo.displayName="${displayName}"` + 
                (isAudio ? '&config.startWithVideoMuted=true' : '');
              setActiveCallUrl(`${data.url}${params}`);
            }}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md"
          >
            {isAudio ? 'Atender Chamada (Voz)' : 'Entrar na Chamada'}
          </button>
        </div>
      );
    }

    const formatBytes = (bytes: number, decimals = 2) => {
      if (!bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    return (
      <div className="py-2 px-1 min-w-[220px] max-w-[260px] flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-slate-800/80 flex items-center justify-center text-lg shadow-inner shrink-0">
            📄
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-semibold text-slate-200 truncate pr-6">{data.name}</span>
            <span className="text-[9.5px] text-slate-450 mt-1">{data.size ? formatBytes(data.size) : 'Arquivo'}</span>
          </div>
        </div>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-700/50"
        >
          Baixar Arquivo
        </a>
      </div>
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load initial contacts and messages
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadData = async () => {
      try {
        // 1. Fetch updated chat permissions for the provider from Supabase
        let currentPermissionType = user.chatPermissionType || 'none';
        let currentAllowedProviders = user.chatAllowedProviders || [];

        try {
          const { data: myData, error: myError } = await supabase
            .from('providers')
            .select('chat_permission_type, chat_allowed_providers')
            .eq('id', user.id)
            .single();

          if (!myError && myData) {
            currentPermissionType = myData.chat_permission_type || 'none';
            currentAllowedProviders = myData.chat_allowed_providers ? JSON.parse(myData.chat_allowed_providers) : [];
            
            // Sync localStorage and Zustand store
            const currentSession = JSON.parse(localStorage.getItem('providerUserSession') || '{}');
            const newSession = {
              ...currentSession,
              chatPermissionType: currentPermissionType,
              chatAllowedProviders: currentAllowedProviders
            };
            localStorage.setItem('providerUserSession', JSON.stringify(newSession));
            useProviderAuthStore.setState({ user: newSession });
          }
        } catch (myErr) {
          console.error('Erro ao atualizar permissões locais:', myErr);
        }

        // 2. Fetch active providers for contact list
        const { data: dbProviders, error: providersError } = await supabase
          .from('providers')
          .select('id, name, role, photo_url, active')
          .eq('active', true);

        if (providersError) throw providersError;

        let availableProviders: any[] = [];
        if (currentPermissionType === 'all') {
          availableProviders = (dbProviders || []).filter(p => p.id !== user.id);
        } else if (currentPermissionType === 'custom') {
          availableProviders = (dbProviders || []).filter(p => p.id !== user.id && currentAllowedProviders.includes(p.id));
        }

        const mappedContacts = availableProviders.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          photo: p.photo_url,
          isSupport: false
        }));

        if (isMounted) {
          setContacts(mappedContacts);
        }

        // 3. Fetch all relevant messages
        const { data: dbMessages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`provider_id.eq.${user.id},provider_id.like.%${user.id}%`)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        if (isMounted) {
          setAllMessages(dbMessages || []);
        }

      } catch (err: any) {
        console.error('Erro ao carregar dados do chat:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      }
    };

    loadData();

    // 3. Realtime subscription to the entire table
    console.log(`[*] Inscrevendo no canal de tempo real global de mensagens para o parceiro ${user.id}`);
    
    const channel = supabase
      .channel(`chat_messages_global_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          if (!isMounted) return;
          console.log('[+] Evento de tempo real recebido:', payload);

          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;

            // Check relevance
            const isRelevant = newMessage.provider_id === user.id || newMessage.provider_id.includes(user.id);
            if (!isRelevant) return;

            setAllMessages((prev) => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              
              if (newMessage.sender_id === user.id) {
                const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === newMessage.content);
                if (tempIndex !== -1) {
                  const updated = [...prev];
                  updated[tempIndex] = newMessage;
                  return updated;
                }
              }
              return [...prev, newMessage];
            });

            // Play sound and mark as read if it is currently open
            if (newMessage.sender_id !== user.id) {
              playChatNotificationSound();
              
              const currentActive = activeContactRef.current;
              const activeChannelId = currentActive
                ? (currentActive.isSupport ? user.id : [user.id, currentActive.id].sort().join('_'))
                : null;
                
              if (newMessage.provider_id === activeChannelId) {
                await supabase
                  .from('chat_messages')
                  .update({ is_read: true })
                  .eq('id', newMessage.id);
              }
            }

            setTimeout(scrollToBottom, 50);

          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as ChatMessage;
            setAllMessages((prev) =>
              prev.map((m) => (m.id === updatedMessage.id || (m.id.startsWith('temp-') && m.content === updatedMessage.content)) ? updatedMessage : m)
            );
          }
        }
      );

    channel.subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputText.trim() || !activeContact) return;

    const activeChannelId = activeContact.isSupport 
      ? user.id 
      : [user.id, activeContact.id].sort().join('_');

    const textToSend = inputText.trim();
    setInputText('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      provider_id: activeChannelId,
      sender_id: user.id,
      sender_name: user.name,
      sender_type: 'provider',
      content: textToSend,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setAllMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);
    playMessageSentSound();

    try {
      const { error, data } = await supabase.from('chat_messages').insert({
        provider_id: activeChannelId,
        sender_id: user.id,
        sender_name: user.name,
        sender_type: 'provider',
        content: textToSend,
      }).select();

      if (error) throw error;

      if (data && data.length > 0) {
        setAllMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data[0] as ChatMessage) : m))
        );
      }
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar',
        description: 'Tente novamente.',
      });
      setAllMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(textToSend);
    }
  };

  const handleSelectContact = async (contact: any) => {
    setActiveContact(contact);
    
    const channelId = contact.isSupport ? user.id : [user.id, contact.id].sort().join('_');
    const unreadMsgs = allMessages.filter(m => m.provider_id === channelId && m.sender_id !== user.id && !m.is_read);
    
    if (unreadMsgs.length > 0) {
      setAllMessages(prev => prev.map(m => m.provider_id === channelId && m.sender_id !== user.id ? { ...m, is_read: true } : m));
      
      try {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('provider_id', channelId)
          .eq('is_read', false)
          .neq('sender_id', user.id);
      } catch (err) {
        console.error("Erro ao marcar mensagens como lidas:", err);
      }
    }
    
    setTimeout(scrollToBottom, 100);
  };

  if (!user) return null;

  const activeChannelId = activeContact
    ? (activeContact.isSupport ? user.id : [user.id, activeContact.id].sort().join('_'))
    : '';

  const activeMessages = allMessages.filter(m => m.provider_id === activeChannelId);

  // Calculate unread counts and last messages per channel
  const unreadCounts = allMessages.reduce((acc, m) => {
    if (m.sender_id !== user.id && !m.is_read) {
      acc[m.provider_id] = (acc[m.provider_id] || 0) + 1;
    }
    return acc;
  }, {} as { [key: string]: number });

  const lastMessages = allMessages.reduce((acc, m) => {
    acc[m.provider_id] = m;
    return acc;
  }, {} as { [key: string]: ChatMessage });

  // Render contacts view if multiple channels are active and no contact is selected
  if (hasMultipleChannels && !activeContact) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] text-slate-100 bg-[#0b141a] relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.16 0 6-2.84 6-6s-2.84-6-6-6-6 2.84-6 6 2.84 6 6 6zm-.667 30C26.543 59 19 51.457 19 43.667c0-7.79 7.543-14.667 14.333-14.667 6.79 0 14.667 6.878 14.667 14.667C48 51.457 40.457 59 33.333 59z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px'
          }}
        />

        {/* Header */}
        <div className="bg-[#202c33] border-b border-slate-800/40 px-4 py-3.5 flex items-center justify-between z-10 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="size-5 text-emerald-400" />
            </div>
            <span className="text-base font-bold text-white leading-tight">Minhas Conversas</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#111b21] z-10 border-b border-slate-800/20">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar ou começar uma nova conversa"
            className="w-full rounded-lg bg-[#202c33] text-sm px-4 py-2 focus:outline-none text-white placeholder-slate-400 transition-colors h-9"
          />
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto z-10 scrollbar-thin divide-y divide-slate-800/30">
          {/* Suporte Fixo */}
          {(() => {
            const supportChannelId = user.id;
            const supportUnread = unreadCounts[supportChannelId] || 0;
            const supportLastMsg = lastMessages[supportChannelId];
            const isMatch = 'suporte técnico e gestão'.includes(searchQuery.toLowerCase());
            
            if (!isMatch) return null;

            return (
              <div
                onClick={() => handleSelectContact({ id: user.id, name: 'Suporte Técnico & Gestão', isSupport: true })}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#202c33]/50 cursor-pointer transition-colors active:bg-[#202c33]"
              >
                <div className="size-11 rounded-full bg-emerald-600 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-inner">
                  🛠️
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-semibold text-white truncate">Suporte Técnico & Gestão</span>
                    {supportLastMsg && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(supportLastMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] text-slate-400 truncate pr-4">
                      {supportLastMsg ? (
                        supportLastMsg.content.startsWith('data:audio/') ? '🎤 Áudio' : supportLastMsg.content
                      ) : (
                        'Nenhuma mensagem ainda'
                      )}
                    </p>
                    {supportUnread > 0 && (
                      <span className="size-4.5 min-w-[18px] h-[18px] rounded-full bg-[#00a884] text-[9.5px] font-bold text-slate-950 flex items-center justify-center px-1">
                        {supportUnread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Colegas Prestadores */}
          {contacts
            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(contact => {
              const channelId = [user.id, contact.id].sort().join('_');
              const unread = unreadCounts[channelId] || 0;
              const lastMsg = lastMessages[channelId];
              
              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#202c33]/50 cursor-pointer transition-colors active:bg-[#202c33]"
                >
                  {contact.photo ? (
                    <img
                      src={contact.photo}
                      alt={contact.name}
                      className="size-11 rounded-full object-cover shrink-0 border border-slate-700/50"
                    />
                  ) : (
                    <div className="size-11 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold shrink-0 uppercase">
                      {contact.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13.5px] font-semibold text-white truncate">{contact.name}</span>
                        {contact.role && (
                          <span className="text-[9.5px] text-slate-500 px-1 py-0.2 bg-slate-800 rounded truncate shrink-0">
                            {contact.role}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <span className="text-[10px] text-slate-500">
                          {new Date(lastMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11.5px] text-slate-400 truncate pr-4">
                        {lastMsg ? (
                          lastMsg.content.startsWith('data:audio/') ? '🎤 Áudio' : lastMsg.content
                        ) : (
                          'Nenhuma mensagem ainda'
                        )}
                      </p>
                      {unread > 0 && (
                        <span className="size-4.5 min-w-[18px] h-[18px] rounded-full bg-[#00a884] text-[9.5px] font-bold text-slate-950 flex items-center justify-center px-1">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
           !'suporte técnico e gestão'.includes(searchQuery.toLowerCase()) && (
            <p className="text-xs text-slate-500 text-center py-8">Nenhum contato encontrado.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] text-slate-100 bg-[#0b141a] relative overflow-hidden">
      {/* WhatsApp Wallpaper Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.16 0 6-2.84 6-6s-2.84-6-6-6-6 2.84-6 6 2.84 6 6 6zm-.667 30C26.543 59 19 51.457 19 43.667c0-7.79 7.543-14.667 14.333-14.667 6.79 0 14.667 6.878 14.667 14.667C48 51.457 40.457 59 33.333 59z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '120px 120px'
        }}
      />

      {/* Header Info */}
      <div className="bg-[#202c33]/90 backdrop-blur-sm border-b border-slate-800/40 px-4 py-3 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          {hasMultipleChannels && (
            <button
              type="button"
              onClick={() => setActiveContact(null)}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-300 transition-colors mr-1 active:scale-95 shrink-0"
              title="Voltar para conversas"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          
          {activeContact?.photo ? (
            <img
              src={activeContact.photo}
              alt={activeContact.name}
              className="size-9 rounded-full object-cover border border-slate-700/50 shrink-0"
            />
          ) : (
            <div className="size-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
              {activeContact?.isSupport ? '🛠' : (activeContact?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '💬')}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white leading-tight truncate">
              {activeContact ? activeContact.name : 'Suporte Técnico & Gestão'}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold mt-0.5 tracking-wide uppercase">
              Online (Tempo Real)
            </span>
          </div>
        </div>

        {activeContact && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleStartCall('audio')}
              className="p-2 text-slate-350 hover:text-emerald-400 hover:bg-slate-800/60 rounded-full transition-all active:scale-95 shrink-0"
              title="Iniciar chamada de voz"
            >
              <Phone className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => handleStartCall('video')}
              className="p-2 text-slate-350 hover:text-emerald-400 hover:bg-slate-800/60 rounded-full transition-all active:scale-95 shrink-0"
              title="Iniciar chamada de vídeo"
            >
              <Video className="size-5" />
            </button>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 scrollbar-thin flex flex-col">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="size-8 rounded-full border-2 border-emerald-950 border-t-emerald-400 animate-spin" />
          </div>
        ) : activeMessages.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-center p-8">
            <div className="size-16 rounded-full bg-[#202c33] flex items-center justify-center border border-slate-700 mb-3 animate-pulse">
              <MessageSquare className="size-8 text-emerald-500" />
            </div>
            <h3 className="font-heading text-sm font-semibold text-slate-200">Suas mensagens aparecem aqui</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              {activeContact?.isSupport
                ? 'Mande uma mensagem para o gestor tirar dúvidas, enviar atestados ou avisos.'
                : `Envie uma mensagem direta em tempo real para ${activeContact?.name}.`}
            </p>
          </div>
        ) : (
          activeMessages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            let isJsonAttachment = false;
            let attachmentData: any = null;
            if (msg.content.startsWith('{')) {
              try {
                attachmentData = JSON.parse(msg.content);
                if (attachmentData && attachmentData.type) {
                  isJsonAttachment = true;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] relative group animate-fade-in ${
                  isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div
                  className={`rounded-xl px-3 py-2 text-[13.5px] leading-relaxed shadow-[0_1px_0.5px_rgba(0,0,0,0.15)] relative ${
                    isMe
                      ? 'bg-[#005c4b] text-white rounded-tr-none'
                      : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/10'
                  }`}
                >
                  {msg.content.startsWith('data:audio/') ? (
                    <AudioPlayer src={msg.content} isMe={isMe} />
                  ) : isJsonAttachment ? (
                    renderAttachment(attachmentData)
                  ) : (
                    <p className="whitespace-pre-wrap break-words pr-12">{msg.content}</p>
                  )}
                  <span className="absolute bottom-1 right-2 text-[9px] text-slate-400/80 select-none flex items-center gap-0.5">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      msg.id.startsWith('temp-') ? (
                        <Check className="size-3 text-slate-400/60" />
                      ) : msg.is_read ? (
                        <CheckCheck className="size-3 text-sky-400 animate-pulse-once" />
                      ) : (
                        <CheckCheck className="size-3 text-slate-400/80" />
                      )
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Area */}
      {isRecording ? (
        <div className="p-3 bg-[#111b21] border-t border-slate-800/40 flex gap-4 items-center justify-between z-10 animate-fade-in w-full">
          <div className="flex items-center gap-3 text-red-500">
            <span className="size-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-sm font-semibold tracking-wider">{formatDuration(recordingDuration)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-full hover:bg-slate-800 text-rose-500 transition-colors active:scale-90"
              title="Cancelar Gravação"
            >
              <Trash2 className="size-5" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="size-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center hover:opacity-90 active:scale-95 shadow-lg"
              title="Enviar Áudio"
            >
              <Send className="size-4 fill-current" />
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-[#111b21] border-t border-slate-800/40 flex gap-2 items-center z-10 animate-fade-in"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          
          {uploadingFile ? (
            <div className="size-10 rounded-full border-2 border-slate-800 border-t-emerald-450 animate-spin shrink-0" />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="size-10 rounded-full flex items-center justify-center transition-all bg-[#2a3942] text-slate-350 hover:text-white active:scale-95 shrink-0"
              title="Anexar Arquivo"
            >
              <Paperclip className="size-5" />
            </button>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Mensagem"
            className="flex-1 rounded-lg bg-[#2a3942] text-sm px-4 py-2.5 focus:outline-none text-white placeholder-slate-400 transition-colors"
          />
          {inputText.trim() ? (
            <button
              type="submit"
              className="size-10 rounded-full flex items-center justify-center transition-all bg-[#00a884] text-white hover:opacity-90 active:scale-95 shadow-md shrink-0"
            >
              <Send className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="size-10 rounded-full flex items-center justify-center transition-all bg-[#2a3942] text-slate-300 hover:text-white active:scale-95 shrink-0"
              title="Gravar Áudio"
            >
              <Mic className="size-5" />
            </button>
          )}
        </form>
      )}

      {/* Fullscreen Image Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 size-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center border border-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
          <img
            src={previewImageUrl}
            alt="Visualização"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* Jitsi Video Call Modal */}
      {activeCallUrl && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col animate-fade-in">
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <span className="font-semibold text-sm text-slate-200">Videochamada em tempo real</span>
            <button
              onClick={() => setActiveCallUrl(null)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Encerrar Chamada
            </button>
          </div>
          <iframe
            src={activeCallUrl}
            allow="camera; microphone; display-capture"
            className="flex-1 w-full border-none"
          />
        </div>
      )}
    </div>
  );
}
