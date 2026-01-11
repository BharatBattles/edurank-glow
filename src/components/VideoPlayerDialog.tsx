import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';
import YouTube, { YouTubeProps } from 'react-youtube';

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle?: string;
  videoChannel?: string;
}

const VideoPlayerDialog = ({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  videoChannel,
}: VideoPlayerDialogProps) => {
  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold line-clamp-2">
                {videoTitle || 'Video'}
              </DialogTitle>
              {videoChannel && (
                <p className="text-sm text-muted-foreground mt-1">{videoChannel}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open in YouTube
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          <YouTube
            videoId={videoId}
            opts={opts}
            className="w-full h-full"
            iframeClassName="w-full h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayerDialog;
