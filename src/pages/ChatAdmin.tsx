import { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageSquare, User, ArrowLeft, Check, CheckCheck, Mic, Trash2, Play, Pause, Volume2, Paperclip, Video, Phone, X } from 'lucide-react';
import { useProviderStore } from '@/stores/useProviderStore';
import { useAuthStore } from '@/stores/useAuthStore';
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

export default function ChatAdmin() {
  const { user: adminUser } = useAuthStore();
  const providerStore = useProviderStore();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

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
    if (!selectedProviderId || !adminUser) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      provider_id: selectedProviderId,
      sender_id: adminUser.id,
      sender_name: adminUser.username || adminUser.email,
      sender_type: 'manager',
      content: base64Audio,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);
    playMessageSentSound();

    try {
      const { error, data } = await supabase.from('chat_messages').insert({
        provider_id: selectedProviderId,
        sender_id: adminUser.id,
        sender_name: adminUser.username || adminUser.email,
        sender_type: 'manager',
        content: base64Audio,
      }).select();

      if (error) throw error;
      if (data && data.length > 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data[0] as ChatMessage) : m))
        );
      }
    } catch (err) {
      console.error('Erro ao enviar áudio:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar áudio',
        description: 'Tente novamente.',
      });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProviderId || !adminUser) return;

    setUploadingFile(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `admin/${fileName}`;

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

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        provider_id: selectedProviderId,
        sender_id: adminUser.id,
        sender_name: adminUser.username || adminUser.email,
        sender_type: 'manager',
        content: contentPayload,
        created_at: new Date().toISOString(),
        is_read: false,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(scrollToBottom, 50);
      playMessageSentSound();

      const { error: insertError, data: insertData } = await supabase.from('chat_messages').insert({
        provider_id: selectedProviderId,
        sender_id: adminUser.id,
        sender_name: adminUser.username || adminUser.email,
        sender_type: 'manager',
        content: contentPayload,
      }).select();

      if (insertError) throw insertError;

      if (insertData && insertData.length > 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (insertData[0] as ChatMessage) : m))
        );
      }

    } catch (err: any) {
      console.error('Erro ao enviar arquivo:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar arquivo',
        description: err.message || 'Tente novamente.',
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!selectedProviderId || !adminUser) return;

    const callPayload = JSON.stringify({
      type: 'call',
      callType: type,
      url: `https://meet.jit.si/pontoface-call-${selectedProviderId}-${Date.now()}`,
      name: type === 'audio' ? 'Chamada de Áudio' : 'Chamada de Vídeo',
    });

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      provider_id: selectedProviderId,
      sender_id: adminUser.id,
      sender_name: adminUser.username || adminUser.email,
      sender_type: 'manager',
      content: callPayload,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);
    playMessageSentSound();

    try {
      const { error, data } = await supabase.from('chat_messages').insert({
        provider_id: selectedProviderId,
        sender_id: adminUser.id,
        sender_name: adminUser.username || adminUser.email,
        sender_type: 'manager',
        content: callPayload,
      }).select();

      if (error) throw error;
      if (data && data.length > 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data[0] as ChatMessage) : m))
        );
      }
    } catch (err) {
      console.error(`Erro ao iniciar chamada de ${type === 'audio' ? 'áudio' : 'vídeo'}:`, err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
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
              const displayName = encodeURIComponent(adminUser ? (adminUser.username || adminUser.email) : 'Administrador');
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

  // 1. Initial load of all unread counts
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('provider_id')
          .eq('sender_type', 'provider')
          .eq('is_read', false);

        if (error) throw error;

        const counts: Record<string, number> = {};
        data?.forEach((row: any) => {
          counts[row.provider_id] = (counts[row.provider_id] || 0) + 1;
        });
        setUnreadCounts(counts);
      } catch (err) {
        console.error('Erro ao buscar notificações pendentes:', err);
      }
    };

    fetchUnreadCounts();

    console.log('[*] Inscrevendo no canal de tempo real global de admins');

    // 2. Subscribe to general chat messages channel
    const channel = supabase
      .channel('chat_admin_global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          console.log('[+] Evento de banco detectado no painel admin:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;
            
            // If message is from a provider
            if (newMessage.sender_type === 'provider') {
              if (newMessage.provider_id === selectedProviderId) {
                // Message is from the active conversation, append it
                setMessages((prev) => {
                  if (prev.some(m => m.id === newMessage.id)) return prev;
                  return [...prev, newMessage];
                });
                
                setTimeout(scrollToBottom, 50);
                playChatNotificationSound(); // Toca som quando a conversa ativa recebe nova mensagem

                // Mark as read in DB
                await supabase
                  .from('chat_messages')
                  .update({ is_read: true })
                  .eq('id', newMessage.id);
              } else {
                // Increment unread badge count
                setUnreadCounts((prev) => ({
                  ...prev,
                  [newMessage.provider_id]: (prev[newMessage.provider_id] || 0) + 1,
                }));
                playChatNotificationSound(); // Toca som de notificação geral de fundo
              }
            } else if (newMessage.sender_type === 'manager') {
              // Se foi enviada por nós (de outra aba/sessão) na conversa ativa
              if (newMessage.provider_id === selectedProviderId) {
                setMessages((prev) => {
                  if (prev.some(m => m.id === newMessage.id)) return prev;
                  
                  // Tenta substituir a versão otimista
                  const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === newMessage.content);
                  if (tempIndex !== -1) {
                    const updated = [...prev];
                    updated[tempIndex] = newMessage;
                    return updated;
                  }
                  
                  return [...prev, newMessage];
                });
                setTimeout(scrollToBottom, 50);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as ChatMessage;
            if (updatedMessage.provider_id === selectedProviderId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === updatedMessage.id || (m.id.startsWith('temp-') && m.content === updatedMessage.content)) ? updatedMessage : m)
              );
            }
          }
        }
      );

    channel.subscribe((status) => {
      console.log(`[Status Canal Realtime Admin]: ${status}`);
      if (status === 'CHANNEL_ERROR') {
        console.error('[X] Erro de conexão no canal Realtime Admin. Verifique se a replicação está ativa na tabela.');
      }
    });

    return () => {
      console.log('[*] Cancelando inscrição do canal global de admins');
      supabase.removeChannel(channel);
    };
  }, [selectedProviderId]);

  // 3. Load active conversation when selected provider changes
  useEffect(() => {
    if (!selectedProviderId) return;

    const loadConversation = async () => {
      setLoadingChat(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('provider_id', selectedProviderId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark all as read in DB
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('provider_id', selectedProviderId)
          .eq('sender_type', 'provider')
          .eq('is_read', false);

        // Clear local unread badge
        setUnreadCounts((prev) => ({
          ...prev,
          [selectedProviderId]: 0,
        }));

      } catch (err: any) {
        console.error('Erro ao abrir conversa:', err);
        toast({
          variant: 'destructive',
          title: 'Erro ao abrir chat',
          description: 'Não foi possível carregar o histórico de mensagens.',
        });
      } finally {
        setLoadingChat(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    loadConversation();
  }, [selectedProviderId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || !inputText.trim() || !adminUser) return;

    const textToSend = inputText.trim();
    setInputText('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      provider_id: selectedProviderId,
      sender_id: adminUser.id,
      sender_name: adminUser.username || adminUser.email,
      sender_type: 'manager',
      content: textToSend,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    
    // Add optimistically
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);
    playMessageSentSound();

    try {
      const { error, data } = await supabase.from('chat_messages').insert({
        provider_id: selectedProviderId,
        sender_id: adminUser.id,
        sender_name: adminUser.username || adminUser.email,
        sender_type: 'manager',
        content: textToSend,
      }).select();

      if (error) throw error;

      // Replace optimistic message with actual DB message
      if (data && data.length > 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data[0] as ChatMessage) : m))
        );
      }
    } catch (err) {
      console.error('Erro ao responder mensagem:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description: 'Tente novamente.',
      });
      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(textToSend); // Restore text
    }
  };

  const selectedProvider = providerStore.providers.find(p => p.id === selectedProviderId);

  // Filter list by search query
  const filteredProviders = providerStore.providers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.role && p.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] border border-slate-800 bg-[#111b21] rounded-xl overflow-hidden shadow-glow relative">
      {/* 1. Sidebar with Providers list */}
      <div
        className={`w-full lg:w-80 flex flex-col border-r border-slate-800 bg-[#111b21] ${
          selectedProviderId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search header */}
        <div className="p-4 bg-[#111b21] border-b border-slate-800 space-y-3">
          <h2 className="font-heading text-lg font-bold text-slate-100">Conversas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar ou começar uma nova conversa"
              className="w-full rounded-lg bg-[#202c33] border-none text-xs pl-9 pr-4 py-2 focus:outline-none text-white placeholder-slate-500 transition-colors"
            />
          </div>
        </div>

        {/* Providers scroll list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 scrollbar-thin">
          {filteredProviders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum prestador encontrado.
            </div>
          ) : (
            filteredProviders.map((p) => {
              const isActive = p.id === selectedProviderId;
              const unread = unreadCounts[p.id] || 0;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProviderId(p.id)}
                  className={`w-full p-4 flex items-center gap-3 transition-colors text-left ${
                    isActive
                      ? 'bg-[#2a3942]'
                      : 'hover:bg-[#202c33]/70'
                  }`}
                >
                  {/* Photo / Avatar */}
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="size-10 rounded-full object-cover border border-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-[#202c33] flex items-center justify-center border border-slate-850 shrink-0">
                      <User className="size-5 text-slate-500" />
                    </div>
                  )}

                  {/* Name and Role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-1">
                      <h4 className="font-semibold text-sm text-slate-200 truncate">{p.name}</h4>
                      {!p.active && (
                        <span className="text-[9px] px-1 rounded bg-error/10 text-error font-medium">Inativo</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{p.role || 'Prestador'}</p>
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && (
                    <span className="size-5 rounded-full bg-[#00a884] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-md">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Conversation Area */}
      <div
        className={`flex-1 flex flex-col bg-[#0b141a] relative ${
          !selectedProviderId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {selectedProvider ? (
          <>
            {/* WhatsApp Doodle Wallpaper Overlay */}
            <div 
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.16 0 6-2.84 6-6s-2.84-6-6-6-6 2.84-6 6 2.84 6 6 6zm-.667 30C26.543 59 19 51.457 19 43.667c0-7.79 7.543-14.667 14.333-14.667 6.79 0 14.667 6.878 14.667 14.667C48 51.457 40.457 59 33.333 59z'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '120px 120px'
              }}
            />

            {/* Conversation Header */}
            <div className="p-3 border-b border-slate-800/40 bg-[#202c33] flex items-center gap-3 justify-between z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  onClick={() => setSelectedProviderId(null)}
                  className="lg:hidden p-1.5 hover:bg-[#2a3942] rounded-lg text-slate-300 mr-1"
                >
                  <ArrowLeft className="size-5" />
                </button>

                {selectedProvider.photo ? (
                  <img
                    src={selectedProvider.photo}
                    alt={selectedProvider.name}
                    className="size-10 rounded-full object-cover border border-slate-800 shrink-0"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-[#111b21] flex items-center justify-center border border-slate-850 shrink-0">
                    <User className="size-5 text-slate-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-200 truncate">{selectedProvider.name}</h3>
                  <p className="text-xs text-slate-400 truncate">{selectedProvider.role || 'Prestador de Serviço'}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStartCall('audio')}
                  className="p-2 text-slate-350 hover:text-emerald-400 hover:bg-[#2a3942] rounded-full transition-all active:scale-95 shrink-0"
                  title="Iniciar chamada de voz"
                >
                  <Phone className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCall('video')}
                  className="p-2 text-slate-350 hover:text-emerald-400 hover:bg-[#2a3942] rounded-full transition-all active:scale-95 shrink-0"
                  title="Iniciar chamada de vídeo"
                >
                  <Video className="size-5" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 z-10 scrollbar-thin flex flex-col">
              {loadingChat ? (
                <div className="flex h-full items-center justify-center">
                  <div className="size-8 rounded-full border-2 border-[#00a884]/20 border-t-[#00a884] animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center text-center p-8">
                  <div className="size-16 rounded-full bg-[#202c33] flex items-center justify-center border border-slate-700 mb-3 animate-pulse">
                    <MessageSquare className="size-8 text-[#00a884]" />
                  </div>
                  <h3 className="font-heading text-sm font-semibold text-slate-200">Nenhuma mensagem registrada</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                    Envie uma mensagem para iniciar o chat com o colaborador.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_type === 'manager';
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
                      className={`flex flex-col max-w-[70%] relative group animate-fade-in ${
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

            {/* Footer Input Area */}
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
                className="p-3 bg-[#111b21] border-t border-slate-800/40 flex gap-3 items-center z-10 animate-fade-in"
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
                  className="flex-1 rounded-lg bg-[#2a3942] text-sm px-4 py-2.5 focus:outline-none text-white placeholder-slate-450 transition-colors"
                />
                
                {inputText.trim() ? (
                  <button
                    type="submit"
                    className="size-10 rounded-full flex items-center justify-center transition-all bg-[#00a884] text-white hover:opacity-90 active:scale-95 shadow-md"
                  >
                    <Send className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="size-10 rounded-full flex items-center justify-center transition-all bg-[#2a3942] text-slate-300 hover:text-white active:scale-95"
                    title="Gravar Áudio"
                  >
                    <Mic className="size-5" />
                  </button>
                )}
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 z-10">
            <div className="size-20 rounded-full bg-[#202c33] border border-slate-800 flex items-center justify-center shadow-glow mb-4 animate-pulse">
              <MessageSquare className="size-10 text-[#00a884]" />
            </div>
            <h3 className="font-heading text-base font-bold text-slate-200">Selecione um colaborador</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              Clique em um colaborador na barra lateral para carregar a conversa em tempo real e responder.
            </p>
          </div>
        )}
      </div>

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
