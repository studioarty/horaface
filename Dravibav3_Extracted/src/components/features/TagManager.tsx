import { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTags } from '@/hooks/useTags';

interface TagManagerProps {
  fileId: string;
}

const TAG_COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Cinza', value: '#6b7280' },
];

export default function TagManager({ fileId }: TagManagerProps) {
  const { tags, addTag, removeTag, isAdding, isRemoving } = useTags(fileId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    addTag({ fileId, tagName: newTagName.trim(), tagColor: selectedColor });
    setNewTagName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Tag className="w-4 h-4" />
          Tags
        </div>
        {!showAddForm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="h-7 gap-1"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: tag.tag_color }}
            >
              {tag.tag_name}
              <button
                onClick={() => removeTag(tag.id)}
                disabled={isRemoving}
                className="hover:opacity-75 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add tag form */}
      {showAddForm && (
        <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Nome da tag"
            autoFocus
            className="h-8 text-sm"
          />

          <div className="flex gap-2">
            {TAG_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color.value,
                  borderColor: selectedColor === color.value ? '#000' : 'transparent',
                }}
                title={color.name}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddTag}
              disabled={isAdding || !newTagName.trim()}
              className="flex-1 h-7"
            >
              Adicionar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setNewTagName('');
              }}
              className="flex-1 h-7"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {tags.length === 0 && !showAddForm && (
        <p className="text-xs text-muted-foreground">Nenhuma tag adicionada</p>
      )}
    </div>
  );
}
