import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function MeasurerOrders() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
      } else {
        setUser(user);
        loadOrders(user.id);
      }
    };
    getUser();
  }, []);

  const loadOrders = async (userId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('measurer_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const statusLabels = {
    draft: 'Черновик',
    measured: 'Отправлен менеджеру',
    assigned: 'Бригада назначена',
    confirmed: 'Подтверждён бригадой',
    in_progress: 'В работе',
    completed: 'Завершён',
    done: 'Закрыт',
    cancelled: 'Отменён',
  };

  const statusColors = {
    draft: '#95a5a6',
    measured: '#3498db',
    assigned: '#9b59b6',
    confirmed: '#f39c12',
    in_progress: '#e67e22',
    completed: '#2ecc71',
    done: '#27ae60',
    cancelled: '#e74c3c',
  };

  if (!user) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#2c3e50' }}>📋 Мои замеры</h1>
        <a
          href="/measurer/create"
          style={{
            padding: '10px 20px',
            backgroundColor: '#4a90d9',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
          }}
        >
          + Новый замер
        </a>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: '40px' }}>
          У вас пока нет замеров. Создайте первый!
        </p>
      ) : (
        orders.map((order) => (
          <a
            key={order.id}
            href={`/measurer/order-detail?id=${order.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                border: '2px solid #e1e8ef',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '12px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                    {order.address}
                  </div>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>
                    {order.opening_height && `Проём: ${order.opening_height}×${order.opening_width}×${order.opening_depth} мм`}
                    {!order.opening_height && 'Размеры не указаны'}
                  </div>
                  {order.planned_amount && (
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                      {order.planned_amount.toLocaleString()} ₽
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: statusColors[order.status] || '#95a5a6',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '500',
                }}>
                  {statusLabels[order.status] || order.status}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#bdc3c7', marginTop: '8px' }}>
                {new Date(order.created_at).toLocaleString('ru-RU')}
              </div>
            </div>
          </a>
        ))
      )}

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/dashboard" style={{ color: '#4a90d9', textDecoration: 'none' }}>
          ← На главную
        </a>
      </div>
    </div>
  );
}