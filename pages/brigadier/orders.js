import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function BrigadierOrders() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      if (profileData && profileData.brigade_id) {
        loadOrders(profileData.brigade_id);
      } else {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadOrders = async (brigadeId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('brigade_id', brigadeId)
      .in('status', ['assigned', 'confirmed', 'in_progress', 'completed'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const statusLabels = {
    assigned: 'Назначен',
    confirmed: 'Подтверждён',
    in_progress: 'В работе',
    completed: 'Завершён',
    done: 'Закрыт',
  };

  const statusColors = {
    assigned: '#9b59b6',
    confirmed: '#f39c12',
    in_progress: '#e67e22',
    completed: '#2ecc71',
    done: '#27ae60',
  };

  if (!user || !profile) return <p style={{ padding: 40 }}>Загрузка...</p>;

  if (!profile.brigade_id) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <h2>Вы не привязаны к бригаде</h2>
        <p>Обратитесь к руководителю для привязки к бригаде.</p>
        <a href="/dashboard">← На главную</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, color: '#2c3e50', marginBottom: 20 }}>🔧 Мои монтажи</h1>

      {loading ? (
        <p>Загрузка...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: 40 }}>Нет активных заказов</p>
      ) : (
        orders.map((order) => (
          <a
            key={order.id}
            href={`/brigadier/order-detail?id=${order.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                border: '2px solid #e1e8ef',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{order.address}</div>
                  {order.planned_amount && (
                    <div style={{ fontWeight: 600, color: '#2c3e50', marginBottom: 4 }}>
                      {order.planned_amount.toLocaleString()} ₽
                    </div>
                  )}
                  {order.actual_amount > 0 && (
                    <div style={{ color: '#27ae60', marginBottom: 4 }}>
                      Оплачено: {order.actual_amount.toLocaleString()} ₽
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  backgroundColor: statusColors[order.status] || '#95a5a6',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  {statusLabels[order.status] || order.status}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#bdc3c7', marginTop: 8 }}>
                {new Date(order.created_at).toLocaleString('ru-RU')}
              </div>
            </div>
          </a>
        ))
      )}

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href="/dashboard" style={{ color: '#4a90d9', textDecoration: 'none' }}>← На главную</a>
      </div>
    </div>
  );
}