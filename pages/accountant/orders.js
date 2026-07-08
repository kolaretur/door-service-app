import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AccountantOrders() {
  const [user, setUser] = useState(null);
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
      loadOrders();
    };
    loadData();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, brigades(name), profiles!measurer_id(full_name)')
      .in('status', ['completed', 'done'])
      .order('finished_at', { ascending: false });

    if (!error && data) {
      // Для каждого заказа грузим файлы и работы
      const ordersWithDetails = await Promise.all(
        data.map(async (order) => {
          const { data: files } = await supabase
            .from('order_files')
            .select('*')
            .eq('order_id', order.id);

          const { data: works } = await supabase
            .from('order_works')
            .select('*, work_types(*)')
            .eq('order_id', order.id);

          let salarySum = 0;
          if (works && order.planned_amount) {
            works.forEach((w) => {
              const actualPrice = order.actual_amount
                ? (w.price / order.planned_amount) * order.actual_amount
                : w.price;
              salarySum += (actualPrice * w.quantity * w.brigade_percent) / 100;
            });
          }

          return {
            ...order,
            files: files || [],
            works: works || [],
            salarySum: Math.round(salarySum),
            hasAct: files?.some((f) => f.file_type === 'act'),
            hasReceipt: files?.some((f) => f.file_type === 'receipt'),
          };
        })
      );
      setOrders(ordersWithDetails);
    }
    setLoading(false);
  };

  const markAsDone = async (orderId) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'done' })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    } else {
      alert('Ошибка: ' + error.message);
    }
  };

  // Формируем данные для 1С
  const generate1CExport = () => {
    const exportData = orders.map((order) => ({
      order_id: order.id,
      address: order.address,
      measurer: order.profiles?.full_name,
      brigade: order.brigades?.name,
      planned_amount: order.planned_amount,
      actual_amount: order.actual_amount,
      works: order.works.map((w) => ({
        name: w.work_types?.name,
        quantity: w.quantity,
        price: w.price,
        brigade_percent: w.brigade_percent,
      })),
      salary_sum: order.salarySum,
      finished_at: order.finished_at,
      has_act: order.hasAct,
      has_receipt: order.hasReceipt,
    }));

    // Скачиваем как JSON-файл
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_1c_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return <p style={{ padding: 40 }}>Загрузка...</p>;

  const totalActual = orders.reduce((sum, o) => sum + (o.actual_amount || 0), 0);
  const totalSalary = orders.reduce((sum, o) => sum + (o.salarySum || 0), 0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#2c3e50' }}>💰 Бухгалтерия</h1>
        <button
          onClick={generate1CExport}
          style={{
            padding: '12px 24px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📥 Выгрузить для 1С
        </button>
      </div>

      {/* Итоги */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', border: '2px solid #e1e8ef' }}>
          <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Завершено заказов</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{orders.length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', border: '2px solid #e1e8ef' }}>
          <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Общая оплата</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{totalActual.toLocaleString()} ₽</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', border: '2px solid #e1e8ef' }}>
          <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Зарплата бригад</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e67e22' }}>{totalSalary.toLocaleString()} ₽</div>
        </div>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: '40px' }}>Нет завершённых заказов</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={{
            backgroundColor: 'white',
            border: '2px solid #e1e8ef',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>{order.address}</div>
                <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Замерщик: {order.profiles?.full_name || '—'} | Бригада: {order.brigades?.name || '—'}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  План: <strong>{order.planned_amount?.toLocaleString()} ₽</strong> | Факт: <strong style={{ color: '#27ae60' }}>{order.actual_amount?.toLocaleString()} ₽</strong>
                </div>
                <div style={{ fontSize: '14px', color: '#e67e22' }}>
                  Зарплата бригады: <strong>{order.salarySum?.toLocaleString()} ₽</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '4px' }}>
                  {order.hasAct ? '✅ Акт' : '❌ Акт'} | {order.hasReceipt ? '✅ Чек' : '❌ Чек'}
                </div>
                {order.status === 'completed' && (
                  <button
                    onClick={() => markAsDone(order.id)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: '#27ae60',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '13px',
                    }}
                  >
                    ✓ Закрыть
                  </button>
                )}
                {order.status === 'done' && (
                  <span style={{ color: '#27ae60', fontWeight: '600', fontSize: '13px' }}>Закрыт</span>
                )}
              </div>
            </div>

            {/* Файлы */}
            {order.files.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {order.files.map((file) => (
                  <a key={file.id} href={file.file_path} target="_blank" rel="noopener noreferrer"
                    style={{
                      fontSize: '13px',
                      color: '#4a90d9',
                      textDecoration: 'none',
                      padding: '4px 10px',
                      backgroundColor: '#f0f6ff',
                      borderRadius: '6px',
                    }}>
                    📎 {file.file_type === 'act' ? 'Акт' : file.file_type === 'receipt' ? 'Чек' : 'Файл'}
                  </a>
                ))}
              </div>
            )}

            <div style={{ fontSize: '12px', color: '#bdc3c7', marginTop: '8px' }}>
              Завершён: {new Date(order.finished_at).toLocaleString('ru-RU')}
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