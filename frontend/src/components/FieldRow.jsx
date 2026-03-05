import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
import FieldOptions from './FieldOptions'
import FieldTypePicker from './FieldTypePicker'

export default function FieldRow({ field, fieldTypes, onChange, onDelete, index }) {
  const [expanded, setExpanded] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  // Find the label for the currently selected type
  const currentLabel = Object.values(fieldTypes || {})
    .flat()
    .find(t => t.type === field.type)?.label

  const hasOptions = ['custom_list','weighted_list','number','sequence','fixed_value',
    'email','date','lorem_ipsum','words','gender','regex','price','text'].includes(field.type)

  return (
    <div ref={setNodeRef} style={style} className="animate-slide-in">
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
          {/* Drag handle */}
          <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-dim)', display: 'flex', padding: 2, flexShrink: 0 }}>
            <GripVertical size={14} />
          </div>

          {/* Row number */}
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)', width: 18, textAlign: 'right', flexShrink: 0 }}>
            {index + 1}
          </span>

          {/* Field name */}
          <input
            className="input"
            style={{ flex: '0 0 180px', fontSize: 13 }}
            placeholder="field_name"
            value={field.name}
            onChange={e => onChange({ ...field, name: e.target.value })}
          />

          {/* Type picker button */}
          <button
            className="btn btn-secondary"
            style={{ flex: 1, justifyContent: 'space-between', minWidth: 0, fontSize: 13, padding: '7px 10px', textAlign: 'left' }}
            onClick={() => setShowPicker(true)}
          >
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: currentLabel ? 'var(--text-primary)' : 'var(--text-dim)',
              flex: 1, textAlign: 'left',
            }}>
              {currentLabel || '— select type —'}
            </span>
            <ChevronRight size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          </button>

          {/* Options toggle */}
          {hasOptions && (
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)} style={{ flexShrink: 0 }}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          {/* Delete */}
          <button className="btn btn-danger btn-sm" onClick={onDelete} style={{ flexShrink: 0 }}>
            <Trash2 size={13} />
          </button>
        </div>

        {/* Options panel */}
        {expanded && hasOptions && (
          <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <FieldOptions field={field} onChange={onChange} />
          </div>
        )}
      </div>

      {/* Field type picker modal */}
      {showPicker && (
        <FieldTypePicker
          fieldTypes={fieldTypes}
          currentType={field.type}
          onSelect={type => onChange({ ...field, type, options: {} })}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
