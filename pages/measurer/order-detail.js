import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function MeasurerOrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [orderWorks, setOrderWorks] = useState([]);

  useEffect(() => {
    if (!id) return;
    const loadOrder = async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, brigades(name)')
        .eq('id', id)
        .single();
      if (orderData) {
        setOrder(orderData);
        const { data: worksData } = await supabase
          .from('order_works')
          .select('*, work_types(*)')
          .eq('order_id', id);
        if (worksData) setOrderWorks(worksData);
      }
    };
    loadOrder();
  }, [id]);

  const statusLabels = {
    draft: 'Черновик',
    measured: 'Отправлен менеджеру',
    assigned: 'Бригада назначена',
    confirmed: 'Подтверждён',
    in_progress: 'В работе',
    completed: 'Завершён',
    done: 'Закрыт',
  };

  if (!order) return <p style={{ padding: 40 }}>Загрузка...</p>;

  const plannedSum = orderWorks.reduce((sum, ow) => sum + ow.price * ow.quantity, 0);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 5 }}>📋 Заказ</h1>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{order.address}</div>
      <div style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 20,
        backgroundColor: '#3498db',
        color: 'white',
        fontSize: 13,
        marginBottom: 20,
      }}>
        {statusLabels[order.status] || order.status}
      </div>

      {order.opening_height && (
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0f4f8', borderRadius: 8 }}>
          <strong>Проём:</strong> {order.opening_height}×{order.opening_width}×{order.opening_depth} мм
        </div>
      )}

      <h3>Виды работ:</h3>
      {orderWorks.map((ow) => (
        <div key={ow.id} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '10px 0', borderBottom: '1px solid #eee'
        }}>
          <div>
            <div style={{ fontWeight: 500 }}>{ow.work_types?.name}</div>
            <div style={{ fontSize: 14, color: '#7f8c8d' }}>
              {ow.quantity} × {ow.price} ₽
            </div>
          </div>
          <div style={{ fontWeight: 600 }}>{(ow.price * ow.quantity).toLocaleString()} ₽</div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15, fontWeight: 600, fontSize: 18 }}>
        <span>Плановая сумма:</span>
        <span>{plannedSum.toLocaleString()} ₽</span>
      </div>

      {order.actual_amount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 18, color: '#27ae60' }}>
          <span>Оплачено:</span>
          <span>{order.actual_amount.toLocaleString()} ₽</span>
        </div>
      )}

      {order.brigades?.name && (
        <div style={{ marginTop: 15, padding: 10, backgroundColor: '#f0f6ff', borderRadius: 8 }}>
          Назначена бригада: <strong>{order.brigades.name}</strong>
        </div>
      )}

      {order.notes && (
        <div style={{ marginTop: 15, padding: 12, backgroundColor: '#fff9e6', borderRadius: 8 }}>
          <strong>Примечания:</strong> {order.notes}
        </div>
      )}

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href="/measurer/orders" style={{ color: '#4a90d9', textDecoration: 'none' }}>← Мои замеры</a>
      </div>
    </div>
  );
}