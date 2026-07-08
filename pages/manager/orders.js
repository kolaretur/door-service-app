import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ManagerOrders() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [brigades, setBrigades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUser(user);
      loadOrders();
      loadBrigades();
    };
    loadData();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, brigades(name), profiles!measurer_id(full_name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const loadBrigades = async () => {
    const { data } = await supabase.from('brigades').select('*');
    if (data) setBrigades(data);
  };

  const assignBrigade = async (orderId, brigadeId) => {
    if (!brigadeId) return;
    const { error } = await supabase
      .from('orders')
      .update({ brigade_id: brigadeId, status: 'assigned', manager_id: user.id })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    } else {
      alert('Ошибка: ' + error.message);
    }
  };

  const statusLabels = {
    draft: 'Черновик',
    measured: 'Отправлен',
    assigned: 'Бригада назначена',
    confirmed: 'Подтверждён',
    in_progress: 'В работе',
    completed: 'Завершён',
    done: 'Закрыт',
    cancelled: 'Отменён',
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  if (!user) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '20px' }}>📊 Панель менеджера</h1>

      {/* Фильтр по статусу */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'measured', 'assigned', 'in_progress', 'completed', 'done'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '8px 16px',
              border: filter === s ? '2px solid #4a90d9' : '2px solid #d1d9e0',
              borderRadius: '20px',
              backgroundColor: filter === s ? '#4a90d9' : 'white',
              color: filter === s ? 'white' : '#2c3e50',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
            }}
          >
            {s === 'all' ? 'Все' : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : filteredOrders.length === 0 ? (
        <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: '40px' }}>Нет заказов</p>
      ) : (
        filteredOrders.map((order) => (
          <div
            key={order.id}
            style={{
              border: '2px solid #e1e8ef',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
              backgroundColor: 'white',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                  {order.address}
                </div>
                <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Замерщик: {order.profiles?.full_name || '—'}
                </div>
                <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>
                  {order.planned_amount && `${order.planned_amount.toLocaleString()} ₽`}
                </div>
                {order.brigades?.name && (
                  <div style={{ fontSize: '14px', color: '#2c3e50' }}>
                    Бригада: {order.brigades.name}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: order.status === 'measured' ? '#3498db' :
                    order.status === 'assigned' ? '#9b59b6' :
                    order.status === 'in_progress' ? '#e67e22' :
                    order.status === 'completed' ? '#2ecc71' : '#95a5a6',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'inline-block',
                  marginBottom: '8px',
                }}>
                  {statusLabels[order.status] || order.status}
                </div>
                {order.status === 'measured' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <select
                      onChange={(e) => assignBrigade(order.id, e.target.value)}
                      defaultValue=""
                      style={{
                        padding: '8px',
                        border: '2px solid #d1d9e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="" disabled>Выбрать бригаду</option>
                      {brigades.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#bdc3c7', marginTop: '8px' }}>
              {new Date(order.created_at).toLocaleString('ru-RU')}
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/dashboard" style={{ color: '#4a90d9', textDecoration: 'none' }}>← На главную</a>
      </div>
    </div>
  );
}