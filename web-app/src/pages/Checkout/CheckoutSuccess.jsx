/**
 * ============================================================================
 * BİLEŞEN ADI: CheckoutSuccess
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Ödeme, adres seçimi ve sipariş tamamlama (Checkout) işlemlerini yürüten ekran.
 * ============================================================================
 */
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const CheckoutSuccess = () => {
    const [searchParams] = useSearchParams();
    const orderNumber = searchParams.get('order');
    const navigate = useNavigate();

    useEffect(() => {
        if (!orderNumber) {
            navigate('/');
        }
    }, [orderNumber, navigate]);

    return (
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <CheckCircle size={80} color="#10b981" />
            </div>
            <h1 style={{ fontSize: '32px', color: '#111', marginBottom: '16px' }}>Siparişiniz Alındı!</h1>
            <p style={{ fontSize: '16px', color: '#555', marginBottom: '24px', lineHeight: '1.6' }}>
                Ödemeniz başarıyla gerçekleşti ve siparişiniz onaylanmak üzere sisteme iletildi. Bizi tercih ettiğiniz için teşekkür ederiz.
            </p>
            <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '32px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>Sipariş Numaranız</span>
                <strong style={{ fontSize: '20px', color: '#111', letterSpacing: '1px' }}>{orderNumber}</strong>
            </div>
            
            <Link to="/" style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', padding: '14px 32px', borderRadius: '6px', fontWeight: '600', textDecoration: 'none' }}>
                ALIŞVERİŞE DEVAM ET
            </Link>
        </div>
    );
};

export default CheckoutSuccess;


