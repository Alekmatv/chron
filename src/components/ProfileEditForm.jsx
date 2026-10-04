/**
 * Inline form for editing the profile name and contact (phone or email).
 */
import { useState } from 'react';
import { t } from '@/i18n/index.js';

const labelStyle = { fontSize: '13px', fontWeight: '700', color: '#C9C1CB' };

const inputStyle = {
  height: '52px',
  boxSizing: 'border-box',
  padding: '0 16px',
  borderRadius: '14px',
  border: '1px solid #2C2830',
  background: '#16141A',
  color: '#F4F1F2',
  fontFamily: 'inherit',
  fontSize: '16px',
};

const buttonStyle = {
  flex: '1',
  minHeight: '48px',
  borderRadius: '14px',
  fontFamily: 'inherit',
  fontSize: '15px',
  fontWeight: '800',
  cursor: 'pointer',
};

/**
 * Profile edit form.
 *
 * @param {object} props
 * @param {string} props.name current name
 * @param {string} props.contact current phone or email
 * @param {(profile: { name: string, contact: string }) => void} props.onSave called with the new values
 * @param {() => void} props.onCancel closes the form without changes
 */
export default function ProfileEditForm({ name, contact, onSave, onCancel }) {
  const [values, setValues] = useState({ name, contact });
  const canSave = values.name.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (canSave) onSave({ name: values.name.trim(), contact: values.contact.trim() });
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRadius: '18px',
        background: '#17151A',
        border: '1px solid #222026',
        animation: 'chronIn .3s ease both',
      }}
    >
      <span style={{ fontSize: '16px', fontWeight: '800' }}>{t('Edytuj profil')}</span>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={labelStyle}>{t('Imię i nazwisko')}</span>
        <input
          type="text"
          value={values.name}
          autoComplete="name"
          maxLength={60}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          style={inputStyle}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={labelStyle}>{t('Telefon lub e-mail')}</span>
        <input
          type="text"
          value={values.contact}
          autoComplete="email"
          maxLength={80}
          onChange={(event) => setValues({ ...values, contact: event.target.value })}
          style={inputStyle}
        />
      </label>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...buttonStyle, border: '1px solid #3A3540', background: '#17151A', color: '#F2EFF3' }}
        >
          {t('Anuluj')}
        </button>
        <button
          type="submit"
          disabled={!canSave}
          style={{ ...buttonStyle, border: '0', background: canSave ? '#E3203A' : '#4A1A22', color: '#FFFFFF' }}
        >
          {t('Zapisz')}
        </button>
      </div>
    </form>
  );
}
