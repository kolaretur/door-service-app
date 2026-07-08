import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HeadDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    plannedSum: 0,
    actualSum: 0,
    brigadeStats: [],
    statusCounts: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUser(user);
      await loadStats();
    };
    loadData();
  }, []);

  const loadStats = async () => {
    // Все заказы
    const { data: orders } = await supabase
      .from('orders')
      .select('*, brigades(name), profiles!measurer_id(full_name)')
      .order('created_at', { ascending: false });

    // Все бригады
    const { data: brigades } = await supabase.from('brigades').select('*');

    if (orders && brigades) {
      const plannedSum = orders.reduce((sum, o) => sum + (o.planned_amount || 0), 0);
      const actualSum = orders.reduce((sum, o) => sum + (o.actual_amount || 0), 0);

      // Статистика по статусам
      const statusCounts = {};
      orders.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });

      // Статистика по бригадам
      const brigadeStats = await Promise.all(
        brigades.map(async (brigade) => {
          const brigadeOrders = orders.filter((o) => o.brigade_id === brigade.id);
          const planned = brigadeOrders.reduce((sum, o) => sum + (o.planned_amount || 0), 0);
          const actual = brigadeOrders.reduce((sum, o) => sum + (o.actual_amount || 0), 0);
          const completed = brigadeOrders.filter((o) => o.status === 'completed' || o.status === 'done');

          // Считаем зарплату по завершённым заказам
          let salarySum = 0;
          for (const order of completed) {
            const { data: works } = await supabase
              .from('order_works')
              .select('*')
              .eq('order_id', order.id);

            if (works) {
              works.forEach((w) => {
                const actualPrice = order.actual_amount
                  ? (w.price / order.planned_amount) * order.actual_amount
                  : w.price;
                salarySum += (actualPrice * w.quantity * w.brigade_percent) / 100;
              });
            }
          }

          return {
            name: brigade.name,
            totalOrders: brigadeOrders.length,
            completedOrders: completed.length,
            planned,
            actual,
            salarySum: Math.round(salarySum),
          };
        })
      );

      setStats({
        totalOrders: orders.length,
        plannedSum,
        actualSum,
        brigadeStats,
        statusCounts,
      });
    }
    setLoading(false);
  };

  const statusLabels = {
    draft: 'Черновик',
    measured: 'Отправлен',
    assigned: 'Назначен',
    confirmed: 'Подтверждён',
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
  if (loading) return <p style={{ padding: 40 }}>Загрузка статистики...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '28px', color: '#2c3e50', marginBottom: '10px' }}>📈 Дашборд руководителя</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Общая статистика по всем заказам и бригадам</p>

      {/* Основные показатели */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '2px solid #e1e8ef' }}>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>Всего заказов</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.totalOrders}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '2px solid #e1e8ef' }}>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>План (замерщики)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>{stats.plannedSum.toLocaleString()} ₽</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '2px solid #e1e8ef' }}>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>Факт (оплачено)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#27ae60' }}>{stats.actualSum.toLocaleString()} ₽</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '2px solid #e1e8ef' }}>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>Выполнение</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e67e22' }}>
            {stats.plannedSum > 0 ? Math.round((stats.actualSum / stats.plannedSum) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Статистика по статусам */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '2px solid #e1e8ef', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#2c3e50' }}>📊 Распределение по статусам</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(stats.statusCounts).map(([status, count]) => (
            <div key={status} style={{
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: statusColors[status] || '#95a5a6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {statusLabels[status] || status}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Статистика по бригадам */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#2c3e50' }}>👷 Статистика по бригадам</h2>
        {stats.brigadeStats.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>Нет данных по бригадам</p>
        ) : (
          stats.brigadeStats.map((bs) => (
            <div key={bs.name} style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #e1e8ef',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontWeight: '600', fontSize: '18px' }}>{bs.name}</div>
                <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                  Заказов: {bs.totalOrders} | Выполнено: {bs.completedOrders}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '15px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#7f8c8d' }}>План</div>
                  <div style={{ fontWeight: '600', color: '#3498db' }}>{bs.planned.toLocaleString()} ₽</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Факт</div>
                  <div style={{ fontWeight: '600', color: '#27ae60' }}>{bs.actual.toLocaleString()} ₽</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Зарплата бригады</div>
                  <div style={{ fontWeight: '600', color: '#e67e22' }}>{bs.salarySum.toLocaleString()} ₽</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Выполнение</div>
                  <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                    {bs.planned > 0 ? Math.round((bs.actual / bs.planned) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <a href="/dashboard" style={{ color: '#4a90d9', textDecoration: 'none' }}>← На главную</a>
      </div>
    </div>
  );
}