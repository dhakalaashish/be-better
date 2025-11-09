import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Send, RotateCcw, Leaf } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to access microphone');
      console.error('Microphone error:', error);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.info('Recording paused');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      setShowActions(true);
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendForTranscription(audioBlob);
      };
    }
  };

  const sendForTranscription = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        // TODO: Call transcription edge function
        // For now, simulate transcription
        setTimeout(() => {
          setTranscription('Your transcribed text will appear here...');
          setIsProcessing(false);
          toast.success('Audio transcribed successfully');
        }, 1500);
      };
    } catch (error) {
      toast.error('Failed to transcribe audio');
      setIsProcessing(false);
    }
  };

  const handleRerecord = () => {
    setTranscription('');
    setShowActions(false);
    audioChunksRef.current = [];
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // TODO: Call analyze edge function with transcription
      setTimeout(() => {
        toast.success('Log created successfully!');
        setTranscription('');
        setShowActions(false);
        setIsProcessing(false);
      }, 1500);
    } catch (error) {
      toast.error('Failed to create log');
      setIsProcessing(false);
    }
  };

  return (
    <div className="pb-20 pt-8 px-4 max-w-lg mx-auto">
      <Card className="mb-6 shadow-md bg-gradient-to-br from-primary/10 to-background">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2 text-primary">
            <Leaf className="w-6 h-6" /> Welcome to BeBetter
          </h1>
          <p className="text-muted-foreground mb-4">
            BeBetter helps you reflect on your daily actions — the good, the bad, and the in-between — so you can understand your habits and grow intentionally over time.
          </p>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" /> What to Record
          </h2>
          <p className="text-muted-foreground text-sm">
            Speak about what you did today: your routines, wins, distractions, or moments you’d like to improve. The app will listen, transcribe, and organize your reflections into meaningful patterns.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6 shadow-md">
        <CardContent className="p-6 min-h-[200px] flex items-center justify-center">
          {transcription ? (
            <p className="text-foreground whitespace-pre-wrap">{transcription}</p>
          ) : (
            <p className="text-muted-foreground text-center">
              {isProcessing ? 'Processing...' : 'Your transcribed content will appear here'}
            </p>
          )}
        </CardContent>
      </Card>

      {showActions && (
        <div className="flex gap-3 mb-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleRerecord}
            disabled={isProcessing}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Re-record
          </Button>
          <Button
            className="flex-1"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            Approve
          </Button>
        </div>
      )}

      <div className="flex justify-center">
        {!isRecording && !showActions ? (
          <Button
            size="lg"
            className="w-24 h-24 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={startRecording}
          >
            <Mic className="w-8 h-8" />
          </Button>
        ) : isRecording ? (
          <div className="flex gap-4">
            {!isPaused ? (
              <Button
                size="lg"
                variant="secondary"
                className="w-20 h-20 rounded-full shadow-lg"
                onClick={pauseRecording}
              >
                <Square className="w-6 h-6" />
              </Button>
            ) : null}
            <Button
              size="lg"
              className="w-20 h-20 rounded-full shadow-lg"
              onClick={stopRecording}
            >
              <Send className="w-6 h-6" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}