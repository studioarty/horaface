import { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, RotateCw, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CommentsPanel from '@/components/features/CommentsPanel';

interface FileViewerProps {
  file: {
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FileViewer({ file, open, onOpenChange }: FileViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showComments, setShowComments] = useState(false);

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isPDF = file.type === 'application/pdf';
  const isText = file.type.startsWith('text/') || file.type.includes('json');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  const resetControls = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        resetControls();
        setShowComments(false);
      }
    }}>
      <DialogContent className="max-w-7xl h-[85vh] p-0 overflow-hidden bg-black/95 flex">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="text-white">
            <h3 className="font-semibold text-lg truncate max-w-md">{file.name}</h3>
            <p className="text-xs text-white/60">{file.type}</p>
          </div>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="text-white hover:bg-white/10"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-white text-sm min-w-[3rem] text-center">{zoom}%</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="text-white hover:bg-white/10"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleRotate}
                  className="text-white hover:bg-white/10"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowComments(!showComments)}
              className={`text-white hover:bg-white/10 ${showComments ? 'bg-white/20' : ''}`}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={`${showComments ? 'w-2/3' : 'w-full'} h-full flex items-center justify-center p-20 overflow-auto transition-all`}>
          {isImage && (
            <img 
              src={file.url} 
              alt={file.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out',
                objectFit: 'contain'
              }}
              className="rounded-lg"
            />
          )}

          {isVideo && (
            <video 
              src={file.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              style={{ maxHeight: '100%' }}
            >
              Seu navegador não suporta vídeo.
            </video>
          )}

          {isPDF && (
            <iframe
              src={file.url}
              className="w-full h-full rounded-lg bg-white"
              title={file.name}
            />
          )}

          {isText && (
            <div className="w-full h-full bg-white rounded-lg p-8 overflow-auto">
              <iframe
                src={file.url}
                className="w-full h-full border-0"
                title={file.name}
              />
            </div>
          )}

          {!isImage && !isVideo && !isPDF && !isText && (
            <div className="text-center text-white">
              <p className="text-lg mb-4">Preview não disponível para este tipo de arquivo</p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Baixar Arquivo
              </Button>
            </div>
          )}
        </div>

        {/* Comments Panel */}
        {showComments && (
          <div className="w-1/3 h-full bg-white border-l border-border">
            <CommentsPanel fileId={file.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
