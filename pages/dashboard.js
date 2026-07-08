import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

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
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (!user || !profile) return <p style={{ padding: 40 }}>Загрузка...</p>;

  const roleLabels = {
    measurer: 'Замерщик',
    manager: 'Менеджер',
    brigadier: 'Бригадир',
    accountant: 'Бухгалтер',
    head: 'Руководитель',
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '10px' }}>
        🚪 Дверная служба
      </h1>
      <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
        Добро пожаловать, <strong>{profile.full_name}</strong> ({roleLabels[profile.role] || profile.role})
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Замерщик */}
        {(profile.role === 'measurer' || profile.role === 'head') && (
          <a href="/measurer/create" style={{
            padding: '16px',
            backgroundColor: '#4a90d9',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            📏 Новый замер
          </a>
        )}

        {(profile.role === 'measurer' || profile.role === 'head') && (
          <a href="/measurer/orders" style={{
            padding: '16px',
            backgroundColor: '#3498db',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            📋 Мои замеры
          </a>
        )}

        {/* Менеджер */}
        {(profile.role === 'manager' || profile.role === 'head') && (
          <a href="/manager/orders" style={{
            padding: '16px',
            backgroundColor: '#9b59b6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            📊 Панель менеджера
          </a>
        )}

        {/* Бригадир */}
        {(profile.role === 'brigadier' || profile.role === 'head') && (
          <a href="/brigadier/orders" style={{
            padding: '16px',
            backgroundColor: '#e67e22',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            🔧 Мои монтажи
          </a>
        )}

        {/* Бухгалтер */}
        {(profile.role === 'accountant' || profile.role === 'head') && (
          <a href="/accountant/orders" style={{
            padding: '16px',
            backgroundColor: '#2ecc71',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            💰 Бухгалтерия
          </a>
        )}

        {/* Руководитель */}
        {profile.role === 'head' && (
          <a href="/head/dashboard" style={{
            padding: '16px',
            backgroundColor: '#2c3e50',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            📈 Дашборд руководителя
          </a>
        )}
      </div>

      <button
        onClick={handleLogout}
        style={{
          marginTop: '30px',
          width: '100%',
          padding: '12px',
          backgroundColor: '#ecf0f1',
          color: '#7f8c8d',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Выйти
      </button>
    </div>
  );
}