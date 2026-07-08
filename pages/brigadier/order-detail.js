import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [orderWorks, setOrderWorks] = useState([]);
  const [actualAmount, setActualAmount] = useState('');
  const [actFile, setActFile] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUser(user);
      if (id) loadOrder();
    };
    loadData();
  }, [id]);

  const loadOrder = async () => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderData) {
      setOrder(orderData);
      setActualAmount(orderData.actual_amount ? String(orderData.actual_amount) : String(orderData.planned_amount || ''));

      const { data: worksData } = await supabase
        .from('order_works')
        .select('*, work_types(*)')
        .eq('order_id', id);

      if (worksData) setOrderWorks(worksData);
    }
  };

  const handleAction = async (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString();
    if (newStatus === 'completed') updates.finished_at = new Date().toISOString();

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setOrder({ ...order, ...updates });
      setMessage(`✅ Статус изменён: ${newStatus}`);
    } else {
      setMessage('Ошибка: ' + error.message);
    }
  };

  const uploadFile = async (file, type) => {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (error) {
      setMessage('Ошибка загрузки файла: ' + error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

    const { error: dbError } = await supabase.from('order_files').insert({
      order_id: id,
      file_name: file.name,
      file_path: urlData.publicUrl,
      file_type: type,
      uploaded_by: user.id,
    });

    if (dbError) {
      setMessage('Ошибка сохранения файла: ' + dbError.message);
      return null;
    }

    return urlData.publicUrl;
  };

  const handleComplete = async () => {
    setUploading(true);
    setMessage('');

    await handleAction('completed');
    if (actFile) await uploadFile(actFile, 'act');
    if (receiptFile) await uploadFile(receiptFile, 'receipt');

    const amount = parseFloat(actualAmount);
    if (!isNaN(amount)) {
      await supabase.from('orders').update({ actual_amount: amount }).eq('id', id);
      setOrder({ ...order, actual_amount: amount, status: 'completed', finished_at: new Date().toISOString() });
    }

    setUploading(false);
    setMessage('✅ Монтаж завершён, документы загружены!');
    loadOrder();
  };

  const statusLabels = {
    assigned: 'Назначен',
    confirmed: 'Подтверждён',
    in_progress: 'В работе',
    completed: 'Завершён',
    done: 'Закрыт',
  };

  if (!order) return <p style={{ padding: 40 }}>Загрузка...</p>;

  const plannedSum = orderWorks.reduce((sum, ow) => sum + ow.price * ow.quantity, 0);
  const brigadeSum = orderWorks.reduce((sum, ow) => sum + (ow.price * ow.quantity * ow.brigade_percent / 100), 0);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, color: '#2c3e50', marginBottom: 10 }}>🔧 Заказ</h1>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 5 }}>{order.address}</div>
      <div style={{ color: '#7f8c8d', marginBottom: 20 }}>
        Статус: {statusLabels[order.status] || order.status}
      </div>

      {/* Размеры */}
      {order.opening_height && (
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0f4f8', borderRadius: 8 }}>
          <strong>Проём:</strong> {order.opening_height}×{order.opening_width}×{order.opening_depth} мм
        </div>
      )}

      {/* Список работ */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>Виды работ:</h3>
        {orderWorks.map((ow) => (
          <div key={ow.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #eee'
          }}>
            <div>
              <div style={{ fontWeight: 500 }}>{ow.work_types?.name}</div>
              <div style={{ fontSize: 14, color: '#7f8c8d' }}>
                {ow.quantity} × {ow.price} ₽ | Бригаде {ow.brigade_percent}%
              </div>
            </div>
            <div style={{ fontWeight: 600 }}>
              {(ow.price * ow.quantity).toLocaleString()} ₽
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 600 }}>
          <span>Плановая сумма:</span>
          <span>{plannedSum.toLocaleString()} ₽</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#27ae60', fontWeight: 600 }}>
          <span>Зарплата бригады:</span>
          <span>{brigadeSum.toLocaleString()} ₽</span>
        </div>
      </div>

      {/* Кнопки действий */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {order.status === 'assigned' && (
          <button onClick={() => handleAction('confirmed')}
            style={{ padding: 14, backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}>
            ✅ Подтвердить работы
          </button>
        )}

        {order.status === 'confirmed' && (
          <button onClick={() => handleAction('in_progress')}
            style={{ padding: 14, backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}>
            ▶ Начать монтаж
          </button>
        )}

        {order.status === 'in_progress' && (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Фактическая оплата (₽)</label>
              <input type="number" value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                style={{ width: '100%', padding: 10, border: '2px solid #d1d9e0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Фото акта</label>
              <input type="file" accept="image/*" onChange={(e) => setActFile(e.target.files[0])}
                style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Фото чека</label>
              <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])}
                style={{ width: '100%' }} />
            </div>
            <button onClick={handleComplete} disabled={uploading}
              style={{ padding: 14, backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 16, opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Сохранение...' : '🏁 Завершить монтаж'}
            </button>
          </>
        )}

        {order.status === 'completed' && (
          <p style={{ color: '#27ae60', fontWeight: 600, textAlign: 'center' }}>
            ✅ Монтаж завершён. Документы переданы бухгалтеру.
          </p>
        )}
      </div>

      {message && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 15,
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
        }}>
          {message}
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <a href="/brigadier/orders" style={{ color: '#4a90d9', textDecoration: 'none' }}>← К списку заказов</a>
      </div>
    </div>
  );
}