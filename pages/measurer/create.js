import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function NewOrder() {
  const [user, setUser] = useState(null);
  const [workTypes, setWorkTypes] = useState([]);
  const [selectedWorks, setSelectedWorks] = useState({});
  const [address, setAddress] = useState('');
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
      } else {
        setUser(user);
      }
    };
    getUser();
    loadWorkTypes();
  }, []);

  const loadWorkTypes = async () => {
    const { data, error } = await supabase.from('work_types').select('*');
    if (!error && data) {
      setWorkTypes(data);
    }
  };

  const toggleWork = (workType) => {
    const updated = { ...selectedWorks };
    if (updated[workType.id]) {
      delete updated[workType.id];
    } else {
      updated[workType.id] = { workType, quantity: 1 };
    }
    setSelectedWorks(updated);
  };

  const updateQuantity = (workTypeId, quantity) => {
    const updated = { ...selectedWorks };
    if (updated[workTypeId]) {
      updated[workTypeId].quantity = parseInt(quantity) || 1;
      setSelectedWorks(updated);
    }
  };

  const plannedAmount = Object.values(selectedWorks).reduce((sum, item) => {
    return sum + item.workType.base_price * item.quantity;
  }, 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setMessage('Введите адрес');
      return;
    }
    if (Object.keys(selectedWorks).length === 0) {
      setMessage('Выберите хотя бы один вид работ');
      return;
    }
    setSaving(true);
    setMessage('');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        address,
        opening_height: height || null,
        opening_width: width || null,
        opening_depth: depth || null,
        notes,
        status: 'measured',
        measurer_id: user.id,
        planned_amount: plannedAmount,
      })
      .select('id')
      .single();

    if (orderError) {
      setMessage('Ошибка создания заказа: ' + orderError.message);
      setSaving(false);
      return;
    }

    const orderWorks = Object.values(selectedWorks).map((item) => ({
      order_id: order.id,
      work_type_id: item.workType.id,
      quantity: item.quantity,
      price: item.workType.base_price,
      brigade_percent: item.workType.brigade_percent,
    }));

    const { error: worksError } = await supabase.from('order_works').insert(orderWorks);
    if (worksError) {
      setMessage('Ошибка сохранения работ: ' + worksError.message);
      setSaving(false);
      return;
    }

    setMessage('✅ Замер успешно сохранён и отправлен менеджеру!');
    setSaving(false);
    setAddress('');
    setHeight('');
    setWidth('');
    setDepth('');
    setNotes('');
    setSelectedWorks({});
  };

  if (!user) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 20, color: '#2c3e50' }}>📏 Новый замер</h1>
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Адрес объекта *</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="ул. Ленина, д. 10, кв. 5" required
            style={{ width: '100%', padding: 10, border: '2px solid #d1d9e0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Высота (мм)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
              placeholder="2100"
              style={{ width: '100%', padding: 10, border: '2px solid #d1d9e0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Ширина (мм)</label>
            <input type="number" value={width} onChange={(e) => setWidth(e.target.value)}
              placeholder="900"
              style={{ width: '100%', padding: 10, border: '2px solid #d1d9e0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Глубина (мм)</label>
            <input type="number" value={depth} onChange={(e) => setDepth(e.target.value)}
              placeholder="200"
              style={{ width: '100%', padding: 10, border: '2px solid #d1d9e0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 10, fontWeight: 500 }}>Виды работ *</label>
          {workTypes.map((wt) => (
            <div key={wt.id}
              onClick={() => toggleWork(wt)}
              style={{
                border: selectedWorks[wt.id] ? '2px solid #4a90d9' : '2px solid #e1e8ef',
                borderRadius: 8, padding: 12, marginBottom: 8,
                backgroundColor: selectedWorks[wt.id] ? '#f0f6ff' : 'white', cursor: 'pointer'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{wt.name}</div>
                  <div style={{ fontSize: 14, color: '#7f8c8d' }}>{wt.base_price} ₽ | Бригаде {wt.brigade_percent}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectedWorks[wt.id] && (
                    <input type="number" value={selectedWorks[wt.id].quantity}
                      onChange={(e) => { e.stopPropagation(); updateQuantity(wt.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()} min="1"
                      style={{ width: 60, padding: 5, border: '1px solid #d1d9e0', borderRadius: 4, textAlign: 'center' }} />
                  )}
                  <input type="checkbox" checked={!!selectedWorks[wt.id]}
                    onChange={() => toggleWork(wt)} style={{ transform: 'scale(1.3)', accentColor: '#4a90d9' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 500 }}>Примечания</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Особенности проёма, пожелания клиента..." rows={3}
            style={{ width: '100%', padding: 10, border: '2px solid #d1d9e0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'system-ui, sans-serif' }} />
        </div>
        <div style={{ backgroundColor: '#f0f4f8', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }}>
          Плановая сумма: {plannedAmount.toLocaleString()} ₽
        </div>
        {message && (
          <div style={{ padding: 12, borderRadius: 8, marginBottom: 15,
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24' }}>
            {message}
          </div>
        )}
        <button type="submit" disabled={saving}
          style={{ width: '100%', padding: 14, backgroundColor: '#4a90d9', color: 'white', border: 'none',
            borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Сохранение...' : 'Сохранить замер'}
        </button>
      </form>
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href="/measurer/orders" style={{ color: '#4a90d9', textDecoration: 'none' }}>← Мои замеры</a>
      </div>
    </div>
  );
}