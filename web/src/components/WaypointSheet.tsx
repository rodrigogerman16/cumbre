import { useState } from 'react';
import { CloseIcon, WAYPOINT_TYPE_COLOR, WAYPOINT_TYPE_LABEL, WAYPOINT_TYPES, WaypointTypeIcon } from '../lib/icons';
import type { WaypointType } from '../lib/types';
import { MediaUploadRow } from './MediaUploadRow';

export interface WaypointDraft {
  type: WaypointType;
  title: string;
  description: string;
  isStageEnd: boolean;
  mediaFiles: File[];
}

interface WaypointSheetProps {
  onClose: () => void;
  onSave: (draft: WaypointDraft) => void;
}

export function WaypointSheet({ onClose, onSave }: WaypointSheetProps) {
  const [type, setType] = useState<WaypointType>('REFUGIO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isStageEnd, setIsStageEnd] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [titleError, setTitleError] = useState(false);

  function handleSave() {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    onSave({ type, title: title.trim(), description: description.trim(), isStageEnd, mediaFiles });
  }

  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Agregar parada</div>
          <button className="icon-btn" onClick={onClose}>
            <CloseIcon size={16} color="var(--ink)" />
          </button>
        </div>

        <div className="field">
          <label className="field-label">Tipo de parada</label>
          <div className="type-opt-row">
            {WAYPOINT_TYPES.map((key) => {
              const colors = WAYPOINT_TYPE_COLOR[key];
              const active = key === type;
              return (
                <button key={key} type="button" className="type-opt" onClick={() => setType(key)}>
                  <div
                    className="type-icon"
                    style={{ background: colors.soft, boxShadow: active ? `0 0 0 2px ${colors.ink} inset` : 'none' }}
                  >
                    <WaypointTypeIcon type={key} size={18} color={colors.ink} />
                  </div>
                  <div className={`type-name${active ? ' active' : ''}`}>{WAYPOINT_TYPE_LABEL[key]}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Título</label>
          <input
            type="text"
            placeholder="Ej: Refugio Jakob"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(false);
            }}
            style={titleError ? { borderColor: 'var(--danger)' } : undefined}
          />
        </div>

        <div className="field">
          <label className="field-label">Descripción</label>
          <textarea
            placeholder="Lo que otros trekkers necesitan saber de este punto..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="toggle-row">
          <div style={{ paddingRight: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Marcar como fin de etapa</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>
              Divide la ruta en días a partir de este punto
            </div>
          </div>
          <button
            type="button"
            className={`toggle-track ${isStageEnd ? 'on' : 'off'}`}
            onClick={() => setIsStageEnd((v) => !v)}
          >
            <div className="toggle-thumb" style={{ left: isStageEnd ? 21 : 3 }} />
          </button>
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <label className="field-label">Fotos y videos</label>
          <MediaUploadRow files={mediaFiles} onChange={setMediaFiles} />
        </div>

        <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={handleSave}>
          Guardar parada
        </button>
      </div>
    </div>
  );
}
