'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Calendar,
  Tag,
  Shield,
  User,
  Star,
  Send,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Clock,
  X,
  Camera,
  AlertTriangle,
  Check,
  FileText,
  Image,
  ShieldCheck,
  Gem,
  Heart,
  ShieldAlert,
  Coins,
  Award,
  Zap,
  Info,
  Trash2,
  Edit3,
  Save,
} from 'lucide-react';
import { getUserBadges } from '@/lib/badges';
import { showMobileNotificationCard } from '@/lib/audioNotification';

const badgeIcons: Record<string, React.ComponentType<any>> = {
  ShieldCheck,
  Award,
  Gem,
  Heart,
  ShieldAlert,
};
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import type { Task, Bid, Message } from '@/lib/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Bekliyor', variant: 'secondary' },
  assigned: { label: 'Atandı', variant: 'default' },
  in_progress: { label: 'Devam Ediyor', variant: 'default' },
  completed: { label: 'Tamamlandı', variant: 'outline' },
  cancelled: { label: 'İptal', variant: 'destructive' },
};

export default function TaskDetailModal() {
  const {
    taskDetailModal: task,
    setTaskDetailModal,
    currentUser,
    updateTask,
    setTasks,
    addNotification,
    setRatingModal,
    addLog,
    updateCurrentUser,
  } = useAppStore();

  const [fullTask, setFullTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [bidProposal, setBidProposal] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [showCustomBidForm, setShowCustomBidForm] = useState(false);
  const [completeProof, setCompleteProof] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);
  const [msgContent, setMsgContent] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Negotiation states
  const [showNegoInput, setShowNegoInput] = useState(false);
  const [negoPrice, setNegoPrice] = useState('');

  // Evidence submission states
  const [evidencePhoto, setEvidencePhoto] = useState('');
  const [evidenceLocation, setEvidenceLocation] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Dispute states
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  // Cancel states
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // AI proof check states
  const [aiRerunning, setAiRerunning] = useState(false);

  // Admin Edit & Delete states
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTaskDetail = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      const data = await res.json();
      if (data.success) {
        setFullTask(data.task);
        setBids(data.task.bids || []);
        setMessages(data.task.messages || []);
      }

      // Also fetch bids separately for latest
      const bidsRes = await fetch(`/api/bids?taskId=${task.id}`);
      const bidsData = await bidsRes.json();
      if (bidsData.success) setBids(bidsData.bids);

      // Fetch messages separately
      const msgRes = await fetch(`/api/messages?taskId=${task.id}`);
      const msgData = await msgRes.json();
      if (msgData.success) setMessages(msgData.messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (task) {
      fetchTaskDetail();
    }
  }, [task, fetchTaskDetail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  const formatDate = (date: string) =>
    date ? new Date(date).toLocaleDateString('tr-TR') : '';

  const handleClose = () => {
    setTaskDetailModal(null);
    setFullTask(null);
    setBids([]);
    setMessages([]);
    setBidAmount('');
    setBidProposal('');
    setCompleteProof('');
    setMsgContent('');
  };

  const refetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) setTasks(data.tasks);
    } catch {
      // silent
    }
  };

  const handleBid = async () => {
    if (!currentUser || !task) return;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }

    setBidLoading(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          taskerId: currentUser.id,
          taskerName: currentUser.fullName,
          taskerRating: currentUser.rating,
          amount,
          proposalText: bidProposal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMobileNotificationCard({
          title: 'Görev Başvurusu Gönderildi!',
          message: `"${task.title}" görevi için ${formatTL(amount)} tutarındaki teklifiniz/başvurunuz işverene iletildi.`,
          taskTitle: task.title,
          fee: amount,
          type: 'accept',
        });
        addLog(`Teklif verildi: ${task.title} → ${formatTL(amount)}`);
        setBidAmount('');
        setBidProposal('');
        fetchTaskDetail();
      } else {
        toast.error(data.message || 'Teklif gönderilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBidLoading(false);
    }
  };

  const handleDirectAcceptTask = async () => {
    if (!currentUser || !task) return;
    setBidLoading(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          taskerId: currentUser.id,
          taskerName: currentUser.fullName,
          taskerRating: currentUser.rating,
          amount: task.fee,
          proposalText: 'Görevi yayınlanan bütçe ile kabul ediyorum ve hemen başlayabilirim.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMobileNotificationCard({
          title: 'Görev Kabul Edildi!',
          message: `"${task.title}" görevi için ${formatTL(task.fee)} bütçeli kabul talebiniz başarıyla iletildi.`,
          taskTitle: task.title,
          fee: task.fee,
          type: 'accept',
        });
        addLog(`Görevi kabul etme talebi gönderildi: ${task.title} → ${formatTL(task.fee)}`);
        setBidAmount('');
        setBidProposal('');
        fetchTaskDetail();
      } else {
        toast.error(data.message || 'Görev kabul talebi gönderilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBidLoading(false);
    }
  };

  const handleAcceptBid = async (bid: Bid) => {
    if (!currentUser || !task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'assigned',
          assignedToId: bid.taskerId,
          assignedToName: bid.taskerName,
          fee: bid.amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        updateTask(task.id, {
          status: 'assigned',
          assignedToId: bid.taskerId,
          assignedToName: bid.taskerName,
          fee: bid.amount,
        });

        // If bid amount differs from original task fee, update requester balance
        if (currentUser.id === task.requesterId && bid.amount !== task.fee) {
          const difference = bid.amount - task.fee;
          if (difference > 0) {
            updateCurrentUser({
              walletBalance: currentUser.walletBalance - difference,
              escrowBalance: currentUser.escrowBalance + difference,
            });
          } else if (difference < 0) {
            updateCurrentUser({
              walletBalance: currentUser.walletBalance + Math.abs(difference),
              escrowBalance: Math.max(0, currentUser.escrowBalance - Math.abs(difference)),
            });
          }
        }

        addNotification({
          id: crypto.randomUUID(),
          userId: bid.taskerId,
          title: 'Teklifiniz Kabul Edildi',
          message: `"${task.title}" görevi size atandı. Anlaşılan tutar: ${bid.amount.toLocaleString('tr-TR')} ₺`,
          type: 'success',
          read: false,
          createdAt: new Date().toISOString(),
        });
        addLog(`Teklif kabul edildi: ${bid.taskerName} → ${task.title} (${bid.amount} ₺)`);
        showMobileNotificationCard({
          title: 'Teklif Kabul Edildi & Görev Atandı!',
          message: `"${task.title}" görevi ${bid.taskerName} kullanıcısına başarıyla atandı (${formatTL(bid.amount)}).`,
          taskTitle: task.title,
          fee: bid.amount,
          type: 'accept',
        });
        fetchTaskDetail();
        refetchTasks();
      } else {
        toast.error(data.message || 'Hata oluştu');
      }
    } catch {
      toast.error('Bağlantı hatası');
    }
  };

  const handleRejectBid = async (bid: Bid) => {
    if (!task) return;
    // We don't have a specific reject endpoint, so we'll just update locally
    toast.info(`${bid.taskerName} teklifi reddedildi`);
    addLog(`Teklif reddedildi: ${bid.taskerName}`);
    fetchTaskDetail();
  };

  const simulatePhotoCapture = () => {
    const urls = [
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=600',
    ];
    const randomUrl = urls[Math.floor(Math.random() * urls.length)];
    setEvidencePhoto(randomUrl);
    toast.success('Kanıt fotoğrafı başarıyla çekildi (Simüle Edildi)');
  };

  const simulateLocationCheckIn = () => {
    const lat = (36.884 + (Math.random() - 0.5) * 0.01).toFixed(4);
    const lng = (30.705 + (Math.random() - 0.5) * 0.01).toFixed(4);
    setEvidenceLocation(`${lat}, ${lng}`);
    toast.success('GPS konumu doğrulandı (Simüle Edildi)');
  };

  const handleDeliverTask = async () => {
    if (!currentUser || !task) return;
    const proofText = completeProof.trim() || 'Görev başarıyla tamamlandı ve teslim edildi.';
    setDeliveryLoading(true);
    try {
      const mockPhoto = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600';
      const mockLocation = '36.8841, 30.7056'; // Simulated Antalya coordination
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'delivered',
          evidenceDescription: proofText,
          evidencePhoto: evidencePhoto || mockPhoto,
          evidenceLocation: evidenceLocation || mockLocation,
        }),
      });
      const data = await res.json();
      if (data.success) {
        updateTask(task.id, {
          status: 'delivered',
          evidencePhoto: evidencePhoto || mockPhoto,
          evidenceDescription: proofText,
          evidenceLocation: evidenceLocation || mockLocation,
        });
        addNotification({
          id: crypto.randomUUID(),
          userId: task.requesterId,
          title: 'Görev Teslim Edildi',
          message: `"${task.title}" görevi ${currentUser.fullName} tarafından teslim edildi. Kontrol edin.`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        });
        addLog(`Görev teslim edildi (onay bekliyor): ${task.title}`);
        showMobileNotificationCard({
          title: 'Görev Bitirildi & Teslim Edildi!',
          message: `"${task.title}" görevi başarıyla bitirildi. İşverenin onaylaması bekleniyor.`,
          taskTitle: task.title,
          fee: task.fee,
          type: 'complete',
        });
        setCompleteProof('');
        setEvidencePhoto('');
        setEvidenceLocation('');
        fetchTaskDetail();
        refetchTasks();
      } else {
        toast.error(data.message || 'Hata oluştu');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleApproveDelivery = async () => {
    if (!currentUser || !task) return;
    setCompleteLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await res.json();
      if (data.success) {
        updateTask(task.id, { status: 'completed' });
        if (task.assignedToId) {
          addNotification({
            id: crypto.randomUUID(),
            userId: task.assignedToId,
            title: 'Görev Onaylandı',
            message: `"${task.title}" görevi onaylandı ve ödeme cüzdanınıza aktarıldı.`,
            type: 'success',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        addLog(`Görev onaylandı (ödemesi serbest): ${task.title}`);
        showMobileNotificationCard({
          title: 'Görev Onaylandı & Ödeme Aktarıldı!',
          message: `"${task.title}" görevi onaylandı. ${formatTL(task.fee)} tutarındaki ödeme cüzdana aktarıldı.`,
          taskTitle: task.title,
          fee: task.fee,
          type: 'complete',
        });

        // Open rating modal: requester rates tasker
        setTimeout(async () => {
          if (task.assignedToId) {
            setRatingModal({
              taskId: task.id,
              taskTitle: task.title,
              targetUserId: task.assignedToId,
              targetUserName: task.assignedToName || 'Görevli',
              fromRole: 'requester',
            });
          }
        }, 800);

        fetchTaskDetail();
        refetchTasks();
      } else {
        toast.error(data.message || 'Hata oluştu');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!currentUser || !task || !disputeReason.trim()) {
      toast.error('Lütfen bir uyuşmazlık nedeni girin');
      return;
    }
    setDisputeLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'disputed',
          disputeReason: disputeReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        updateTask(task.id, {
          status: 'disputed',
          disputeReason: disputeReason.trim(),
        });
        if (task.assignedToId) {
          addNotification({
            id: crypto.randomUUID(),
            userId: task.assignedToId,
            title: 'Göreve İtiraz Edildi',
            message: `"${task.title}" görevi için uyuşmazlık başlatıldı. Hakem incelemesi bekleniyor.`,
            type: 'warning',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        addLog(`Görev uyuşmazlığa düştü: ${task.title}`);
        toast.warning('Uyuşmazlık başlatıldı. Hakem heyeti bilgilendirildi.');
        setDisputeOpen(false);
        setDisputeReason('');
        fetchTaskDetail();
        refetchTasks();
      } else {
        toast.error(data.message || 'Hata oluştu');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleCancelTask = async () => {
    if (!currentUser || !task) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (data.success) {
        updateTask(task.id, { status: 'cancelled' });
        addNotification({
          id: crypto.randomUUID(),
          userId: task.requesterId,
          title: 'Görev İptal Edildi',
          message: `"${task.title}" görevi iptal edildi. Escrow'daki ${formatTL(task.fee)} tutarındaki ödeme cüzdanınıza iade edildi.`,
          type: 'warning',
          read: false,
          createdAt: new Date().toISOString(),
        });
        if (task.assignedToId) {
          addNotification({
            id: crypto.randomUUID(),
            userId: task.assignedToId,
            title: 'Görev İptal Edildi ❌',
            message: `"${task.title}" görevi işveren tarafından iptal edildi.`,
            type: 'warning',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        addLog(`Görev iptal edildi & escrow iade edildi: ${task.title}`);
        toast.success(`Görev iptal edildi. ${formatTL(task.fee)} escrow'dan cüzdanınıza iade edildi.`);
        setCancelOpen(false);
        fetchTaskDetail();
        refetchTasks();
        // refresh wallet balances
        try {
          const meRes = await fetch('/api/auth/me');
          const meData = await meRes.json();
          if (meData.success && meData.user) {
            updateCurrentUser(meData.user);
          }
        } catch { /* silent */ }
      } else {
        toast.error(data.message || 'Görev iptal edilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReRunAiCheck = async () => {
    if (!task) return;
    setAiRerunning(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/ai-check`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const v = data.task?.aiCheckVerdict;
        const s = data.task?.aiCheckScore;
        if (v === 'human') toast.success(`Tarama tamamlandı: İnsan yapımı (%${Math.round(s)} güven)`);
        else if (v === 'ai_suspected') toast.error(`Tarama tamamlandı: Yapay zeka şüphesi (%${Math.round(s)} insan güveni)`);
        else toast.warning(`Tarama tamamlandı: Belirsiz (%${Math.round(s)})`);
        fetchTaskDetail();
      } else {
        toast.error(data.message || 'Tarama başlatılamadı');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setAiRerunning(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !task || !msgContent.trim()) return;
    setMsgLoading(true);
    try {
      const receiverId = task.requesterId === currentUser.id
        ? (task.assignedToId || task.requesterId)
        : task.requesterId;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          content: msgContent,
          receiverId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMsgContent('');
        fetchTaskDetail();
      }
    } catch {
      toast.error('Mesaj gönderilemedi');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleSendNegotiation = async () => {
    if (!currentUser || !task || !negoPrice) return;
    const price = Number(negoPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Geçerli bir pazarlık tutarı girin');
      return;
    }
    setMsgLoading(true);
    try {
      const receiverId = task.requesterId === currentUser.id
        ? (task.assignedToId || task.requesterId)
        : task.requesterId;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          content: `Pazarlık Teklifi: ${price.toLocaleString('tr-TR')} ₺`,
          receiverId,
          isNegotiation: true,
          negotiationPrice: price,
          negotiationStatus: 'pending',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNegoPrice('');
        setShowNegoInput(false);
        fetchTaskDetail();
        toast.success('Pazarlık teklifi gönderildi');
      }
    } catch {
      toast.error('Pazarlık teklifi gönderilemedi');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleResolveNegotiation = async (messageId: string, action: 'accept' | 'reject') => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'accept') {
          const newFee = typeof data.newFee === 'number' ? data.newFee : task.fee;
          toast.success(`Pazarlık kabul edildi! Yeni görev bütçesi: ${newFee.toLocaleString('tr-TR')} ₺`);
          updateTask(task.id, { fee: newFee });
          if (currentUser && task.requesterId === currentUser.id) {
            const difference = newFee - task.fee;
            if (difference > 0) {
              updateCurrentUser({
                walletBalance: currentUser.walletBalance - difference,
                escrowBalance: currentUser.escrowBalance + difference,
              });
            } else if (difference < 0) {
              updateCurrentUser({
                walletBalance: currentUser.walletBalance + Math.abs(difference),
                escrowBalance: Math.max(0, currentUser.escrowBalance - Math.abs(difference)),
              });
            }
          }
          refetchTasks();
        } else {
          toast.info('Pazarlık teklifi reddedildi');
        }
        fetchTaskDetail();
      } else {
        toast.error(data.message || 'İşlem başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası');
    }
  };

  const handleSendMockImage = async () => {
    if (!currentUser || !task) return;
    const mockImages = [
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600',
    ];
    const mockUrl = mockImages[Math.floor(Math.random() * mockImages.length)];
    const content = `[Resim Paylaşıldı: Saha Fotoğrafı] ${mockUrl}`;
    setMsgLoading(true);
    try {
      const receiverId = task.requesterId === currentUser.id
        ? (task.assignedToId || task.requesterId)
        : task.requesterId;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          content,
          receiverId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTaskDetail();
      }
    } catch {
      toast.error('Görsel gönderilemedi');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!window.confirm(`"${task.title}" görevini silmek istediğinize emin misiniz?`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Görev başarıyla silindi');
        addLog(`Admin görevi sildi: ${task.title}`);
        handleClose();
        refetchTasks();
      } else {
        toast.error(data.message || 'Görev silinemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStartAdminEdit = () => {
    if (!displayTask) return;
    setEditTitle(displayTask.title);
    setEditFee(String(displayTask.fee));
    setEditCategory(displayTask.category);
    setEditCity(displayTask.city);
    setEditDesc(displayTask.description);
    setEditStatus(displayTask.status);
    setAdminEditMode(true);
  };

  const handleSaveAdminEdit = async () => {
    if (!task) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          fee: Number(editFee),
          category: editCategory,
          city: editCity,
          description: editDesc,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Görev bilgileri güncellendi');
        addLog(`Admin görevi güncelledi: ${editTitle}`);
        setAdminEditMode(false);
        fetchTaskDetail();
        refetchTasks();
      } else {
        toast.error(data.message || 'Güncelleme başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setEditLoading(false);
    }
  };

  if (!task) return null;

  const isRequester = currentUser?.id === task.requesterId;
  const isAssignee = currentUser?.id === task.assignedToId;
  const isAdmin = currentUser?.role === 'admin';
  const displayTask = fullTask || task;

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b dark:border-white/10">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant={statusMap[displayTask.status]?.variant || 'secondary'} className="text-[11px]">
                  {statusMap[displayTask.status]?.label || displayTask.status}
                </Badge>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {displayTask.category}
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    {!adminEditMode ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-blue-500 text-blue-600 dark:text-blue-400 gap-1 px-2.5 font-bold"
                        onClick={handleStartAdminEdit}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Düzenle
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 font-bold"
                        onClick={handleSaveAdminEdit}
                        disabled={editLoading}
                      >
                        {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Kaydet
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs gap-1 px-2.5 font-bold"
                      onClick={handleDeleteTask}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Sil
                    </Button>
                  </div>
                )}
              </div>

              {!adminEditMode ? (
                <DialogTitle className="text-lg leading-snug">{displayTask.title}</DialogTitle>
              ) : (
                <div className="space-y-2 mt-2 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Admin Düzenleme Modu</p>
                  <input
                    className="w-full text-sm font-semibold p-1.5 rounded border bg-background"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Görev Başlığı"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="text-xs p-1.5 rounded border bg-background font-bold text-blue-600"
                      value={editFee}
                      onChange={(e) => setEditFee(e.target.value)}
                      placeholder="Ücret (₺)"
                    />
                    <input
                      className="text-xs p-1.5 rounded border bg-background"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Şehir"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 space-y-4 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Task Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{displayTask.city}{displayTask.district ? `, ${displayTask.district}` : ''}</span>
                </div>
                {displayTask.dueDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{formatDate(displayTask.dueDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span>{formatTL(displayTask.fee)}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayTask.description}
              </p>

              {/* Assignee Action Banner */}
              {isAssignee && (displayTask.status === 'assigned' || displayTask.status === 'in_progress') && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between gap-3 shadow-md border border-emerald-500">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
                    <div>
                      <p className="font-bold text-xs sm:text-sm">Bu Görev Size Atandı</p>
                      <p className="text-[11px] text-emerald-100">Görevi tamamladığınızda buradan tek tıkla bitirebilirsiniz.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold shrink-0 text-xs h-9 px-3.5 shadow-sm gap-1.5"
                    onClick={handleDeliverTask}
                    disabled={deliveryLoading}
                  >
                    {deliveryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    Görevi Bitir
                  </Button>
                </div>
              )}

              {/* Requester info */}
              {displayTask.requester && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      {displayTask.requester.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium">{displayTask.requester.fullName}</p>
                      {getUserBadges(displayTask.requester as any).map((badge) => {
                        const IconComponent = badgeIcons[badge.icon] || Award;
                        return (
                          <span
                            key={badge.id}
                            title={badge.name + ": " + badge.description}
                            className={`inline-flex items-center p-0.5 rounded bg-gradient-to-r ${badge.color} text-white text-[9px] font-semibold cursor-help`}
                          >
                            <IconComponent className="w-2.5 h-2.5" />
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{displayTask.requester.city}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {displayTask.requester.rating}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignee info with badges */}
              {displayTask.assignee && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-purple-600 text-white text-xs">
                      {displayTask.assignee.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium">{displayTask.assignee.fullName}</p>
                      {getUserBadges(displayTask.assignee as any).map((badge) => {
                        const IconComponent = badgeIcons[badge.icon] || Award;
                        return (
                          <span
                            key={badge.id}
                            title={badge.name + ": " + badge.description}
                            className={`inline-flex items-center p-0.5 rounded bg-gradient-to-r ${badge.color} text-white text-[9px] font-semibold cursor-help`}
                          >
                            <IconComponent className="w-2.5 h-2.5" />
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">Atanan Görevli</span>
                      <span>•</span>
                      <span>{displayTask.assignee.city}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {displayTask.assignee.rating}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Bid & Accept Form (shown for ALL pending tasks so buttons are ALWAYS visible) */}
              {displayTask.status === 'pending' && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Shield className="w-4.5 h-4.5 text-blue-600" />
                      Göreve Başlama & Teklif Seçenekleri
                    </h4>
                    <Badge variant="outline" className="text-xs font-bold text-blue-600 border-blue-300">
                      Yayınlanan Bütçe: {formatTL(displayTask.fee)}
                    </Badge>
                  </div>

                  {isRequester && (
                    <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>Bu ilan sizin tarafınızdan yayınlanmıştır. Test amacıyla aşağıdaki kabul ve teklif butonlarını deneyebilirsiniz.</span>
                    </div>
                  )}

                  {/* 2 Clear Distinct Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: Direct Accept & Start */}
                    <div className="p-3.5 rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white flex flex-col justify-between space-y-3 shadow-md hover:bg-emerald-700 transition-colors">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>1. Verilen Fiyatı Kabul Et</span>
                        </div>
                        <p className="text-[11px] text-emerald-100 mt-1 leading-snug">
                          İşverenin belirlediği {formatTL(displayTask.fee)} bütçeyi onaylayıp görevi doğrudan kabul edin.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-xs h-9 shadow-sm gap-1.5"
                        onClick={() => {
                          if (!currentUser) {
                            toast.info('Görevi kabul etmek için lütfen giriş yapın.');
                            return;
                          }
                          handleDirectAcceptTask();
                        }}
                        disabled={bidLoading}
                      >
                        {bidLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                        Görevi Kabul Et ({formatTL(displayTask.fee)})
                      </Button>
                    </div>

                    {/* Option 2: Submit Custom Offer */}
                    <div className="p-3.5 rounded-xl bg-blue-600 dark:bg-blue-700 text-white flex flex-col justify-between space-y-3 shadow-md hover:bg-blue-700 transition-colors">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <Coins className="w-4 h-4 text-blue-200" />
                          <span>2. Yeni Teklif Ver</span>
                        </div>
                        <p className="text-[11px] text-blue-100 mt-1 leading-snug">
                          İşverene farklı bir fiyat teklifi veya kendi çalışma koşullarınızı iletin.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-white text-blue-800 hover:bg-blue-50 font-extrabold text-xs h-9 shadow-sm gap-1.5"
                        onClick={() => {
                          if (!currentUser) {
                            toast.info('Teklif vermek için lütfen giriş yapın.');
                            return;
                          }
                          setShowCustomBidForm(!showCustomBidForm);
                        }}
                      >
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                        {showCustomBidForm ? 'Formu Kapat' : 'Yeni Teklif Verme Formu'}
                      </Button>
                    </div>
                  </div>

                  {/* Custom Bid Form (toggleable) */}
                  {showCustomBidForm && (
                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-blue-600" />
                        Yeni Teklif Bilgileri
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Teklif Ettiğiniz Ücret (₺)</Label>
                          <Input
                            type="number"
                            placeholder={String(displayTask.fee)}
                            className="h-9 text-sm"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Teklif Notu / Açıklamanız</Label>
                        <Textarea
                          placeholder="Neden bu teklifi verdiğinizi ve görevi nasıl yapacağınızı açıklayın..."
                          rows={2}
                          className="text-sm"
                          value={bidProposal}
                          onChange={(e) => setBidProposal(e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
                        onClick={handleBid}
                        disabled={bidLoading}
                      >
                        {bidLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                        <Send className="w-3.5 h-3.5" />
                        Yeni Teklifi İşverene Gönder
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Bids List (for requester) */}
              {isRequester && displayTask.status === 'pending' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Gelen Teklifler ({bids.length})</h4>
                  {bids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz teklif yok</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bids.map((bid) => (
                        <div
                          key={bid.id}
                          className="p-3 rounded-lg border space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-indigo-600 text-white text-[10px]">
                                  {bid.taskerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="text-sm font-medium">{bid.taskerName}</p>
                                  {bid.tasker && getUserBadges(bid.tasker as any).map((badge) => {
                                    const IconComponent = badgeIcons[badge.icon] || Award;
                                    return (
                                      <span
                                        key={badge.id}
                                        title={badge.name + ": " + badge.description}
                                        className={`inline-flex items-center p-0.5 rounded bg-gradient-to-r ${badge.color} text-white text-[9px] font-semibold cursor-help`}
                                      >
                                        <IconComponent className="w-2.5 h-2.5" />
                                      </span>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  {bid.taskerRating}
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {formatTL(bid.amount)}
                            </span>
                          </div>
                          {bid.proposalText && (
                            <p className="text-xs text-muted-foreground">{bid.proposalText}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleAcceptBid(bid)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Kabul Et
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleRejectBid(bid)}
                            >
                              Reddet
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cancel Task (for requester/admin on active tasks) */}
              {(isRequester || isAdmin) && ['pending', 'assigned', 'in_progress'].includes(displayTask.status) && (
                <div className="space-y-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  {!cancelOpen ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          Görevi İptal Et
                        </p>
                        <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                          Escrow'daki {formatTL(displayTask.fee)} tutarındaki ödeme cüzdanınıza tam olarak iade edilir.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="shrink-0 gap-1.5"
                        onClick={() => setCancelOpen(true)}
                      >
                        <X className="w-3.5 h-3.5" />
                        İptal Et
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">Görevi iptal etmek istediğinize emin misiniz?</p>
                      <p className="text-xs text-red-600/90 dark:text-red-400/90 leading-relaxed">
                        "{displayTask.title}" görevi iptal edilecek ve escrow hesabındaki <span className="font-bold">{formatTL(displayTask.fee)}</span> bloke tutarı cüzdanınıza geri yüklenecektir.
                        {displayTask.assignedToName && ` Görevli (${displayTask.assignedToName}) bilgilendirilecektir.`} Bu işlem geri alınamaz.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelLoading}>
                          Vazgeç
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleCancelTask} disabled={cancelLoading}>
                          {cancelLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                          Evet, İptal Et & İade Al
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Task / Deliver (for assignee) */}
              {isAssignee && (displayTask.status === 'assigned' || displayTask.status === 'in_progress') && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    Görev Teslim Formu
                  </h4>
                  <div className="space-y-1">
                    <Label className="text-xs">Teslim Notu / Kanıt Açıklaması</Label>
                    <Textarea
                      placeholder="Görevi nasıl tamamladığınızı, teslim detaylarını buraya yazın..."
                      rows={2}
                      className="text-sm"
                      value={completeProof}
                      onChange={(e) => setCompleteProof(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Kanıt Fotoğrafı</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5 h-9"
                        onClick={simulatePhotoCapture}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {evidencePhoto ? 'Fotoğraf Değiştir' : 'Fotoğraf Çek (Simüle)'}
                      </Button>
                      <Input
                        type="url"
                        placeholder="veya kanıt URL'si yapıştırın (/proof/...)"
                        className="text-[10px] h-7 mt-1"
                        value={evidencePhoto}
                        onChange={(e) => setEvidencePhoto(e.target.value)}
                      />
                      {evidencePhoto && (
                        <p className="text-[10px] text-green-600 truncate mt-1">✓ Fotoğraf eklendi</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">GPS Konum Kanıtı</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5 h-9"
                        onClick={simulateLocationCheckIn}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {evidenceLocation ? 'Konumu Yenile' : 'Konum Ekle (Simüle)'}
                      </Button>
                      {evidenceLocation && (
                        <p className="text-[10px] text-green-600 truncate mt-1">✓ {evidenceLocation}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-10 gap-2 shadow-md hover:shadow-lg transition-all"
                    onClick={handleDeliverTask}
                    disabled={deliveryLoading}
                  >
                    {deliveryLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    )}
                    Görevi Bitir ve Teslim Et
                  </Button>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Kanıtlarınız teslimde otomatik yapay zeka taramasından geçer; kamera/EXIF verisi ve metin özgünlüğü incelenir.
                  </p>
                </div>
              )}

              {/* Delivered Info - Review Evidence (for Requester) */}
              {isRequester && displayTask.status === 'delivered' && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <FileText className="w-5 h-5" />
                    <span className="font-semibold text-sm">Görev Teslim Edildi (Onay Bekliyor)</span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-background rounded-lg border space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Görevlinin Teslim Notu:</p>
                      <p className="text-xs leading-relaxed">{displayTask.evidenceDescription || 'Açıklama belirtilmedi.'}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {displayTask.evidencePhoto && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground">Gönderilen Kanıt Fotoğrafı:</span>
                          <div className="relative rounded-lg overflow-hidden border aspect-video max-h-36">
                            <img
                              src={displayTask.evidencePhoto}
                              alt="Kanıt fotoğrafı"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {displayTask.evidenceLocation && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground">GPS Konum Koordinatları:</span>
                          <div className="p-3 bg-background rounded-lg border text-xs font-mono flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-red-500" />
                            {displayTask.evidenceLocation} (Antalya Merkez)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Proof Authenticity Check */}
                    {displayTask.aiCheckVerdict ? (
                      <div className={`p-3 rounded-lg border space-y-2 ${
                        displayTask.aiCheckVerdict === 'human'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : displayTask.aiCheckVerdict === 'ai_suspected'
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      }`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {displayTask.aiCheckVerdict === 'human' ? (
                              <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            ) : displayTask.aiCheckVerdict === 'ai_suspected' ? (
                              <ShieldAlert className="w-5 h-5 text-red-600" />
                            ) : (
                              <Info className="w-5 h-5 text-amber-600" />
                            )}
                            <span className={`text-xs font-bold ${
                              displayTask.aiCheckVerdict === 'human'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : displayTask.aiCheckVerdict === 'ai_suspected'
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-amber-700 dark:text-amber-300'
                            }`}>
                              Yapay Zeka Taraması:{' '}
                              {displayTask.aiCheckVerdict === 'human'
                                ? 'İnsan Yapımı ✓'
                                : displayTask.aiCheckVerdict === 'ai_suspected'
                                  ? 'Yapay Zeka Üretimi Şüphesi ⚠'
                                  : 'Belirsiz — Manuel İnceleme'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                              displayTask.aiCheckVerdict === 'human'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : displayTask.aiCheckVerdict === 'ai_suspected'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                              %{Math.round(displayTask.aiCheckScore || 0)} insan güveni
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] gap-1"
                              onClick={handleReRunAiCheck}
                              disabled={aiRerunning}
                            >
                              {aiRerunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                              Yeniden Tara
                            </Button>
                          </div>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{displayTask.aiCheckReason}</p>
                        {(() => {
                          try {
                            const sigs = JSON.parse(displayTask.aiCheckSignals || '[]') as string[];
                            if (!sigs.length) return null;
                            return (
                              <details className="text-[10px] text-muted-foreground">
                                <summary className="cursor-pointer font-semibold">Teknik sinyaller ({sigs.length})</summary>
                                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                                  {sigs.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </details>
                            );
                          } catch { return null; }
                        })()}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-slate-400" />
                          Kanıt henüz yapay zeka taramasından geçmedi.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[10px] gap-1"
                          onClick={handleReRunAiCheck}
                          disabled={aiRerunning}
                        >
                          {aiRerunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-600" />}
                          Şimdi Tara
                        </Button>
                      </div>
                    )}
                  </div>

                  {!disputeOpen ? (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        onClick={handleApproveDelivery}
                        disabled={completeLoading}
                      >
                        {completeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <Check className="w-3.5 h-3.5" />
                        Onayla (Ödemeyi Serbest Bırak)
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => setDisputeOpen(true)}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        İtiraz Et
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                      <Label className="text-xs font-semibold text-destructive">İtiraz / Uyuşmazlık Nedeni</Label>
                      <Textarea
                        placeholder="Ödemeyi neden durdurmak istediğinizi açıklayın. Hakem heyeti bu metni inceleyecektir..."
                        rows={2}
                        className="text-sm"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setDisputeOpen(false)}>
                          Vazgeç
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleOpenDispute}
                          disabled={disputeLoading}
                        >
                          {disputeLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                          Uyuşmazlık Başlat
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivered Info (for assignee) */}
              {isAssignee && displayTask.status === 'delivered' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock className="w-5 h-5 animate-pulse" />
                    <span className="font-semibold">Görevi Teslim Ettiniz (Onay Bekleniyor)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Görev kanıtlarınız işverenin onayına sunulmuştur. İşveren onayladığında escrow hesabındaki ödeme otomatik olarak cüzdanınıza aktarılacaktır. Herhangi bir uyuşmazlık durumunda platform hakem heyeti devreye girecektir.
                  </p>
                  <div className="p-3 bg-background rounded-lg border space-y-1 text-xs">
                    <p className="font-semibold text-muted-foreground">Gönderilen Kanıt Açıklamanız:</p>
                    <p className="italic">{displayTask.evidenceDescription}</p>
                  </div>
                </div>
              )}

              {/* Disputed Info (shown to both assignee and requester) */}
              {displayTask.status === 'disputed' && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Uyuşmazlık İncelemesi Başlatıldı</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    İşveren görev teslimatına itiraz etti ve ödeme bloke edildi. Platform hakem heyeti (admin) hem teslimat kanıtlarını hem de itiraz gerekçelerini inceleyerek 24 saat içinde nihai kararı verecektir.
                  </p>
                  <div className="p-3 bg-background rounded-lg border space-y-1.5 text-xs">
                    <p className="font-semibold text-red-600">İtiraz Gerekçesi:</p>
                    <p className="italic">{displayTask.disputeReason || 'Belirtilmedi'}</p>
                  </div>
                </div>
              )}

              {/* Cancelled Info */}
              {displayTask.status === 'cancelled' && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-2">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <X className="w-5 h-5" />
                    <span className="font-semibold text-sm">Görev İptal Edildi</span>
                  </div>
                  <p className="text-xs text-red-600/90 dark:text-red-400/90 leading-relaxed">
                    Bu görev iptal edildi. Escrow'da blokeli {formatTL(displayTask.fee)} tutarındaki ödeme işverenin cüzdanına <span className="font-semibold">tam olarak iade edildi</span> (komisyon kesintisi yapılmadı). İşlem geçmişinde bu iade "İptal İadesi" kaydı olarak tutulmaktadır.
                  </p>
                </div>
              )}

              {/* Completed Info */}
              {displayTask.status === 'completed' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold text-sm">Görev Tamamlandı</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {formatTL(displayTask.fee)} tutarı escrow'dan görevlinin cüzdanına aktarıldı.
                      {displayTask.assignedToName && ` Atanan: ${displayTask.assignedToName}`}
                    </p>
                  </div>
                  {/* Rating buttons for both parties */}
                  {displayTask.assignedToId && (
                    <div className="flex flex-wrap gap-2">
                      {isRequester && displayTask.assignedToId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
                          onClick={() => {
                            setRatingModal({
                              taskId: displayTask.id,
                              taskTitle: displayTask.title,
                              targetUserId: displayTask.assignedToId!,
                              targetUserName: displayTask.assignedToName || 'Görevli',
                              fromRole: 'requester',
                            });
                          }}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {displayTask.assignedToName} Kişisini Değerlendir
                        </Button>
                      )}
                      {isAssignee && displayTask.requesterId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
                          onClick={() => {
                            setRatingModal({
                              taskId: displayTask.id,
                              taskTitle: displayTask.title,
                              targetUserId: displayTask.requesterId,
                              targetUserName: displayTask.requester?.fullName || 'İşi Veren',
                              fromRole: 'tasker',
                            });
                          }}
                        >
                          <Star className="w-3.5 h-3.5" />
                          İşi Vereni Değerlendir
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Messages Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Mesajlar ({messages.length})
                </h4>

                <div className="max-h-60 overflow-y-auto space-y-2 p-3 rounded-lg glass-card border border-slate-200/50 dark:border-white/10">
                  {messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Henüz mesaj yok
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-xl text-xs shadow-sm ${
                              isMine
                                ? 'bg-blue-600/90 dark:bg-blue-600/80 text-white rounded-br-sm shadow-[0_4px_12px_rgba(59,130,246,0.15)]'
                                : 'bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-bl-sm'
                            }`}
                          >
                            <p className="font-semibold text-[10px] mb-0.5 opacity-80">
                              {msg.senderName}
                            </p>
                             {msg.isNegotiation ? (
                              <div className="space-y-2 mt-1.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-foreground dark:text-white neon-border-blue">
                                <p className="font-bold text-amber-600 dark:text-amber-400">Pazarlık Fiyat Teklifi</p>
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{msg.negotiationPrice?.toLocaleString('tr-TR')} ₺</p>
                                {msg.negotiationStatus === 'pending' ? (
                                  isMine ? (
                                    <p className="text-[10px] text-amber-600 italic">Karşı tarafın onayı bekleniyor...</p>
                                  ) : (
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] py-1 px-2.5 h-6 font-bold"
                                        onClick={() => handleResolveNegotiation(msg.id, 'accept')}
                                      >
                                        Kabul Et
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] py-1 px-2.5 h-6 font-bold"
                                        onClick={() => handleResolveNegotiation(msg.id, 'reject')}
                                      >
                                        Reddet
                                      </Button>
                                    </div>
                                  )
                                ) : msg.negotiationStatus === 'accepted' ? (
                                  <Badge variant="default" className="bg-green-600 text-white text-[9px] font-bold">
                                    Kabul Edildi
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[9px] font-bold">
                                    Reddedildi
                                  </Badge>
                                )}
                              </div>
                            ) : msg.content.startsWith('[Resim Paylaşıldı:') ? (
                              <div className="space-y-1 mt-1">
                                <span className="italic font-medium opacity-90 block">{msg.content.split(']')[0] + ']'}</span>
                                <img
                                  src={msg.content.split(']')[1]?.trim()}
                                  alt="Shared file"
                                  className="rounded-lg max-h-32 object-cover border border-white/20 mt-1 max-w-xs"
                                />
                              </div>
                            ) : (
                              <p className="leading-relaxed">{msg.content}</p>
                            )}
                            <p className={`text-[9px] mt-1 opacity-70 ${isMine ? 'text-blue-200' : 'text-muted-foreground'}`}>
                              {new Date(msg.createdAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {displayTask.status !== 'completed' && displayTask.status !== 'cancelled' && (
                  <div className="space-y-2">
                    {/* Quick templates */}
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        "Görevi teslim aldım, yola çıkıyorum.",
                        "Görevi tamamladım, kanıtları yükledim.",
                        "Konum doğrulamasını yaptım.",
                      ].map((tpl) => (
                        <button
                          key={tpl}
                          type="button"
                          onClick={() => setMsgContent(tpl)}
                          className="text-[10px] bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-full text-muted-foreground transition-colors"
                        >
                          {tpl}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="shrink-0 h-9 w-9"
                        title="Fotoğraf Gönder (Simüle)"
                        onClick={handleSendMockImage}
                        disabled={msgLoading}
                      >
                        <Image className="w-4 h-4 text-blue-600" />
                      </Button>
                      {(displayTask.status === 'assigned' || displayTask.status === 'in_progress') && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className={`shrink-0 h-9 w-9 ${showNegoInput ? 'bg-amber-100 dark:bg-amber-950 border-amber-300' : ''}`}
                          title="Pazarlık Teklifi Gönder"
                          onClick={() => setShowNegoInput(!showNegoInput)}
                          disabled={msgLoading}
                        >
                          <Coins className="w-4 h-4 text-amber-600 animate-pulse" />
                        </Button>
                      )}
                      {showNegoInput ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            placeholder="Teklif fiyatı (₺)..."
                            type="number"
                            className="text-sm h-9 flex-1"
                            value={negoPrice}
                            onChange={(e) => setNegoPrice(e.target.value)}
                          />
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white h-9 px-3 shrink-0 text-xs font-semibold"
                            onClick={handleSendNegotiation}
                            disabled={msgLoading || !negoPrice}
                          >
                            Teklif Et
                          </Button>
                        </div>
                      ) : (
                        <Input
                          placeholder="Mesaj yazın..."
                          className="text-sm h-9 flex-1"
                          value={msgContent}
                          onChange={(e) => setMsgContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        />
                      )}
                      {!showNegoInput && (
                        <Button
                          size="icon"
                          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white h-9 w-9"
                          onClick={handleSendMessage}
                          disabled={msgLoading || !msgContent.trim()}
                        >
                          {msgLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}