import {useState} from 'react';
import {supabase} from '@/supabase';
import {SectionHeader} from './ui-kit/SectionHeader';

const tables = [
  'torre_tasks',
  'torre_scheduled_blocks',
  'torre_work_hours',
  'torre_preferences',
  'torre_labels',
  'torre_task_labels',
  'torre_people',
  'torre_task_people',
  'torre_conversations',
  'torre_conversation_tasks',
  'torre_captures',
  'torre_attachments',
  'torre_week_proposals',
];

export function ExportData() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function exportAll() {
    setBusy(true);
    setMessage('');
    try {
      const data: Record<string, unknown> = {};
      for (const table of tables) {
        const {data: rows, error} = await supabase.from(table).select('*');
        if (error) throw new Error(`${table}: ${error.message}`);
        data[table] = rows;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify({exportedAt: new Date().toISOString(), tables: data}, null, 2)], {type: 'application/json'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `torre-dados-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setMessage('Arquivo gerado. Os anexos (arquivos) não fazem parte da exportação.');
    } catch (error) {
      setMessage(`Não foi possível exportar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionHeader title="Dados" description="Exportação e privacidade das suas informações." />
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16}}>
        <div>
          <div style={{fontWeight: 500}}>Exportar meus dados</div>
          <p className="desc">Tarefas, labels, pessoas e conversas em JSON. Seus dados continuam privados.</p>
        </div>
        <button className="btn" disabled={busy} onClick={() => void exportAll()}>
          {busy ? 'Exportando…' : 'Exportar JSON'}
        </button>
      </div>
      {message && <p className="desc" role="status">{message}</p>}
    </>
  );
}
