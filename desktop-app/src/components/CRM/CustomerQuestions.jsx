/**
 * ============================================================================
 * BİLEŞEN ADI: CustomerQuestions
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP CRM - E-Ticaret Ürün Soruları ve Şikayetleri Yönetim Paneli.
 *   Vitrin müşterilerinden gelen soruları filtreler, yanıtlar, yayınlar ve
 *   kötü niyetli/uygunsuz soruları siler.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const CustomerQuestions = ({ currentUser }) => {
    const [questions, setQuestions] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, answered: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Beklemede');
    const [topicFilter, setTopicFilter] = useState('Tümü');

    // Yanıtlama Modal / Form State
    const [answeringQuestion, setAnsweringQuestion] = useState(null);
    const [answerText, setAnswerText] = useState('');
    const [submittingAnswer, setSubmittingAnswer] = useState(false);

    // Silme Onay Modal State
    const [deletingQuestion, setDeletingQuestion] = useState(null);
    const [deletingLoading, setDeletingLoading] = useState(false);

    const topics = [
        'Tümü',
        'Ürün İçeriği & Formül',
        'Kullanım Şekli',
        'Kargo & Paketleme',
        'Son Kullanma Tarihi',
        'Diğer'
    ];

    useEffect(() => {
        fetchQuestions();
    }, [statusFilter, topicFilter]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (statusFilter && statusFilter !== 'Tümü') queryParams.append('status', statusFilter);
            if (topicFilter && topicFilter !== 'Tümü') queryParams.append('topic', topicFilter);
            if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());

            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/crm/questions?${queryParams.toString()}`);
            const data = await res.json();
            if (data.success) {
                setQuestions(data.questions || []);
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            console.error('Sorular yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchQuestions();
    };

    const openAnswerModal = (q) => {
        setAnsweringQuestion(q);
        setAnswerText(q.answer || '');
    };

    const handleSaveAnswer = async () => {
        if (!answerText.trim()) {
            alert('Lütfen bir yanıt metni girin.');
            return;
        }

        setSubmittingAnswer(true);
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/crm/questions/${answeringQuestion.id}/answer`, {
                method: 'PUT',
                body: JSON.stringify({ answer: answerText.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setAnsweringQuestion(null);
                setAnswerText('');
                fetchQuestions();
            } else {
                alert(data.message || 'Yanıt kaydedilemedi.');
            }
        } catch (error) {
            console.error('Yanıt kaydetme hatası:', error);
            alert('Sunucu ile iletişim kurulurken hata oluştu.');
        } finally {
            setSubmittingAnswer(false);
        }
    };

    const handleDeleteQuestion = async () => {
        if (!deletingQuestion) return;

        setDeletingLoading(true);
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/crm/questions/${deletingQuestion.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setDeletingQuestion(null);
                fetchQuestions();
            } else {
                alert(data.message || 'Soru silinemedi.');
            }
        } catch (error) {
            console.error('Soru silme hatası:', error);
            alert('Sunucu hatası oluştu.');
        } finally {
            setDeletingLoading(false);
        }
    };

    const handleRejectQuestion = async (id) => {
        if (!window.confirm('Bu soruyu reddetmek ve yayından kaldırmak istediğinize emin misiniz?')) return;

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/crm/questions/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'Reddedildi' })
            });
            const data = await res.json();
            if (data.success) {
                fetchQuestions();
            } else {
                alert(data.message || 'İşlem başarısız.');
            }
        } catch (error) {
            console.error('Durum değiştirme hatası:', error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Cevaplandı':
                return { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', text: 'Cevaplandı (Yayında)' };
            case 'Reddedildi':
                return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', text: 'Reddedildi' };
            default:
                return { bg: '#fffbeb', color: '#92400e', border: '#fde68a', text: 'Cevap Bekliyor' };
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
            {/* Üst Başlık ve Yenileme Butonu */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#0f172a', fontWeight: '700', letterSpacing: '-0.5px' }}>
                        Şikayet ve Sorular
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                        E-ticaret mağazasından gelen ürün sorularını inceleyin, yanıtlayıp vitrinde yayınlayın veya kötü niyetli soruları silin.
                    </p>
                </div>
                <button
                    onClick={fetchQuestions}
                    style={{
                        background: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                    }}
                >
                    <span>🔄</span> Yenile
                </button>
            </div>

            {/* İstatistik Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Cevap Bekleyen
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#d97706', marginTop: '6px' }}>
                        {stats.pending}
                    </div>
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>Yanıt bekleyen sorular</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Cevaplananlar
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669', marginTop: '6px' }}>
                        {stats.answered}
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>Vitrinde yayında</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Reddedilenler
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626', marginTop: '6px' }}>
                        {stats.rejected}
                    </div>
                    <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>Yayınlanmayanlar</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Toplam Soru
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginTop: '6px' }}>
                        {stats.total}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Sistemdeki tüm kayıtlar</div>
                </div>
            </div>

            {/* Filtre ve Arama Alanı */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Durum Sekmeleri */}
                    <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                        {['Beklemede', 'Cevaplandı', 'Reddedildi', 'Tümü'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                style={{
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    background: statusFilter === status ? '#ffffff' : 'transparent',
                                    color: statusFilter === status ? '#0f172a' : '#64748b',
                                    boxShadow: statusFilter === status ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {status === 'Beklemede' ? '⏳ Cevap Bekleyenler' : status === 'Cevaplandı' ? '✅ Cevaplananlar' : status === 'Reddedildi' ? '🚫 Reddedilenler' : '📋 Tümü'}
                            </button>
                        ))}
                    </div>

                    {/* Konu ve Arama */}
                    <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: '320px' }}>
                        <select
                            value={topicFilter}
                            onChange={(e) => setTopicFilter(e.target.value)}
                            style={{
                                padding: '9px 14px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                color: '#334155',
                                background: '#ffffff',
                                outline: 'none',
                                minWidth: '180px'
                            }}
                        >
                            {topics.map((t) => (
                                <option key={t} value={t}>{t === 'Tümü' ? '📁 Tüm Konular' : `📌 ${t}`}</option>
                            ))}
                        </select>

                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '380px' }}>
                            <input
                                type="text"
                                placeholder="Ürün, kod, soru veya müşteri ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '9px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px',
                                    color: '#1e293b',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: '#0ea5e9',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '9px 16px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Ara
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Soru Listesi */}
            {loading ? (
                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                    Sorular ve şikayetler yükleniyor...
                </div>
            ) : questions.length === 0 ? (
                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#334155' }}>Herhangi bir soru veya talep bulunamadı.</div>
                    <p style={{ fontSize: '13px', marginTop: '6px', color: '#94a3b8' }}>Seçili filtrelere uygun müşteri sorusu bulunmuyor.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {questions.map((q) => {
                        const statusBadge = getStatusBadge(q.status);
                        return (
                            <div
                                key={q.id}
                                style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '20px 24px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                    transition: 'box-shadow 0.2s'
                                }}
                            >
                                {/* Kart Üst Bölümü: Ürün ve Durum Bilgisi */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        {q.productImage ? (
                                            <img
                                                src={`${import.meta.env.VITE_API_URL || ''}${q.productImage.startsWith('/') ? '' : '/'}${q.productImage}`}
                                                alt={q.ProductName}
                                                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid #e2e8f0' }}>
                                                📦
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>
                                                {q.ProductName}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '12px', marginTop: '2px' }}>
                                                <span>Kod: <strong style={{ color: '#0284c7' }}>{q.ProductCode || '-'}</strong></span>
                                                <span>•</span>
                                                <span>Tarih: <strong>{formatDate(q.created_at)}</strong></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {/* Konu Rozeti */}
                                        <span style={{
                                            background: '#f1f5f9',
                                            color: '#334155',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            📌 {q.topic || 'Genel'}
                                        </span>

                                        {/* Gizlilik Rozeti */}
                                        <span style={{
                                            background: '#f8fafc',
                                            color: '#475569',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            🔒 Vitrinde Yıldızlı
                                        </span>

                                        {/* Durum Rozeti */}
                                        <span style={{
                                            background: statusBadge.bg,
                                            color: statusBadge.color,
                                            border: `1px solid ${statusBadge.border}`,
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '700'
                                        }}>
                                            {statusBadge.text}
                                        </span>
                                    </div>
                                </div>

                                {/* Müşteri ve Soru İçeriği */}
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                    {/* Müşteri Kimlik Paneli */}
                                    <div style={{ width: '220px', flexShrink: 0, background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>
                                            Soran Müşteri
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                            {q.CustomerName}
                                        </div>
                                        {q.is_anonymous ? (
                                            <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px', fontWeight: '500' }}>
                                                (Vitrinde maskelenir)
                                            </div>
                                        ) : null}
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', wordBreak: 'break-all' }}>
                                            ✉️ {q.CustomerEmail || '-'}
                                        </div>
                                        {q.CustomerPhone && (
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                📞 {q.CustomerPhone}
                                            </div>
                                        )}
                                    </div>

                                    {/* Soru ve Cevap Kutusu */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                                                Müşteri Sorusu:
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#0f172a', lineHeight: '1.5', background: '#fdfdfd', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
                                                {q.question}
                                            </div>
                                        </div>

                                        {/* Eğer Cevaplandıysa Cevap Gösterimi */}
                                        {q.answer && (
                                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px' }}>
                                                <div style={{ fontSize: '12px', color: '#166534', fontWeight: '700', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span>💬 Verilen Yanıt (Vitrinde Yayında):</span>
                                                    <span style={{ fontWeight: '500', color: '#15803d' }}>
                                                        {q.AnsweredByName ? `Yanıtlayan: ${q.AnsweredByName}` : ''} {q.answered_at ? `(${formatDate(q.answered_at)})` : ''}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#14532d', lineHeight: '1.5' }}>
                                                    {q.answer}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Alt Aksiyon Butonları */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                    {/* Kötü Niyetli / Soruyu Sil Butonu */}
                                    <button
                                        onClick={() => setDeletingQuestion(q)}
                                        style={{
                                            background: '#fff1f2',
                                            color: '#be123c',
                                            border: '1px solid #fecdd3',
                                            padding: '7px 14px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s'
                                        }}
                                        title="Kötü niyetli, hakaret veya spam içeren soruları sistemden kalıcı olarak siler"
                                    >
                                        <span>🗑️</span> Kötü Niyetli / Soruyu Sil
                                    </button>

                                    {/* Reddet Butonu (Silmeden yayınlanmasını engellemek için) */}
                                    {q.status !== 'Reddedildi' && (
                                        <button
                                            onClick={() => handleRejectQuestion(q.id)}
                                            style={{
                                                background: '#f8fafc',
                                                color: '#64748b',
                                                border: '1px solid #cbd5e1',
                                                padding: '7px 14px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            🚫 Reddet
                                        </button>
                                    )}

                                    {/* Yanıtla Butonu */}
                                    <button
                                        onClick={() => openAnswerModal(q)}
                                        style={{
                                            background: '#0ea5e9',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '7px 18px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 1px 2px rgba(14,165,233,0.3)',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <span>✍️</span> {q.answer ? 'Yanıtı Güncelle' : 'Yanıtla & Vitrinde Yayınla'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Yanıt Ekleme / Düzenleme Modalı */}
            {answeringQuestion && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '650px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>
                                    {answeringQuestion.answer ? 'Yanıtı Düzenle' : 'Soruyu Yanıtla & Vitrinde Yayınla'}
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                    Bu yanıt e-ticaret vitrininde ürün detayında herkes tarafından görüntülenecektir.
                                </p>
                            </div>
                            <button
                                onClick={() => setAnsweringQuestion(null)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Ürün & Müşteri Özeti */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    <strong>Ürün:</strong> {answeringQuestion.ProductName} ({answeringQuestion.ProductCode})
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    <strong>Müşteri:</strong> {answeringQuestion.CustomerName} • <strong>Konu:</strong> {answeringQuestion.topic}
                                </div>
                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '13px', color: '#1e293b', fontStyle: 'italic' }}>
                                    "{answeringQuestion.question}"
                                </div>
                            </div>

                            {/* Yanıt Metni Textarea */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                    Yetkili Mağaza Yanıtınız:
                                </label>
                                <textarea
                                    rows="5"
                                    placeholder="Müşteriye nazik, açıklayıcı ve profesyonel bir dille yanıt verin..."
                                    value={answerText}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '14px',
                                        color: '#0f172a',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                                    {answerText.length} karakter
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setAnsweringQuestion(null)}
                                style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleSaveAnswer}
                                disabled={submittingAnswer || !answerText.trim()}
                                style={{
                                    background: '#059669',
                                    border: 'none',
                                    padding: '9px 22px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#ffffff',
                                    cursor: submittingAnswer || !answerText.trim() ? 'not-allowed' : 'pointer',
                                    opacity: submittingAnswer || !answerText.trim() ? 0.6 : 1,
                                    boxShadow: '0 1px 3px rgba(5,150,105,0.3)'
                                }}
                            >
                                {submittingAnswer ? 'Kaydediliyor...' : '✅ Yanıtla ve Vitrinde Yayınla'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme (Kötü Niyetli Soru) Onay Modalı */}
            {deletingQuestion && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '520px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #fecdd3', background: '#fff1f2', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '28px' }}>⚠️</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', color: '#be123c', fontWeight: '700' }}>
                                    Kötü Niyetli / Uygunsuz Soruyu Sil
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9f1239' }}>
                                    Bu işlem geri alınamaz ve soru veritabanından tamamen silinir.
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                                Aşağıdaki soru spam, kötü niyetli veya topluluk kurallarına aykırı olduğu için kalıcı olarak silinecektir:
                            </p>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#0f172a', fontStyle: 'italic' }}>
                                "{deletingQuestion.question}"
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                <strong>Müşteri:</strong> {deletingQuestion.CustomerName} ({deletingQuestion.CustomerEmail})
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setDeletingQuestion(null)}
                                style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeleteQuestion}
                                disabled={deletingLoading}
                                style={{
                                    background: '#be123c',
                                    border: 'none',
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#ffffff',
                                    cursor: deletingLoading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 1px 3px rgba(190,18,60,0.4)'
                                }}
                            >
                                {deletingLoading ? 'Siliniyor...' : '🗑️ Evet, Soruyu Kalıcı Olarak Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerQuestions;
