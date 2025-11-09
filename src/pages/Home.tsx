import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Send, RotateCcw, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY

export default function Home() {
  // ✅ 1. Fetch events directly from Supabase
  const { user } = useAuth();
  const navigate = useNavigate()
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
      if (!BACKEND_URL) {
        throw new Error("Backend URL is not configured.");
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch(`${BACKEND_URL}/process_audio`, {
        method: 'POST',
        headers: {
          "X-Access-Key": ACCESS_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      setTranscription(data.transcribed_content);
      toast.success('Audio transcribed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to transcribe audio');
      console.error('Transcription error:', error);
    } finally {
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
      if (!transcription) {
        toast.error('No transcription available.');
        setIsProcessing(false);
        return;
      }

      if (!user) {
        toast.error('User not logged in.');
        setIsProcessing(false);
        return;
      }

      // fetch user's events
      const { data: userEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      // 2️⃣ Fetch user's goals from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('goals')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const userGoals = profile?.goals || [];

      // ✅ 2. Send transcription + existing events to backend
      const response = await fetch(`${BACKEND_URL}/process_content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Key": ACCESS_KEY,
        },
        body: JSON.stringify({
          transcribed_content: transcription,
          existing_events: userEvents || [],
          user: {
            id: user.id,
            name: user.user_metadata?.name || null,
            goals: userGoals
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process content");
      }

      const data = await response.json();
      console.log("Process Content Response:", data);

      const { suggested_goals, suggested_events, suggested_logs } = data;

      // 🧩 Step 4: Check if Gemini returned anything meaningful
      const hasNewData =
        (suggested_goals && suggested_goals.length > 0) ||
        (suggested_events && suggested_events.length > 0) ||
        (suggested_logs && suggested_logs.length > 0);

      if (!hasNewData) {
        toast.info("You need to talk about your day, please!");
        setIsProcessing(false);
        return;
      }

      // 🧭 Step 5: Create new goals
      if (suggested_goals && suggested_goals.length > 0) {
        const newGoalTexts = suggested_goals.map((g: any) => g.goal);
        const updatedGoals = [...userGoals, ...newGoalTexts];

        const { error: updateGoalError } = await supabase
          .from("profiles")
          .update({ goals: updatedGoals })
          .eq("id", user.id);

        if (updateGoalError) throw updateGoalError;
      }

      // 🧱 Step 6: Create new events
      let createdEvents: Record<string, string> = {}; // map name → id
      if (suggested_events && suggested_events.length > 0) {
        for (const ev of suggested_events) {
          const { data: inserted, error: insertError } = await supabase
            .from("events")
            .insert({
              name: ev.name,
              importance: ev.importance,
              type: ev.type,
              goal: ev.goal,
              user_id: user.id,
            })
            .select("id, name")
            .single();

          if (insertError) throw insertError;
          if (inserted) createdEvents[inserted.name] = inserted.id;
        }
      }

      // 🧾 Step 7: Create logs
      if (suggested_logs && suggested_logs.length > 0) {
        for (const log of suggested_logs) {
          const eventId =
            log.event_id ||
            createdEvents[log.event_name] ||
            null;

          if (!eventId) continue; // skip if no valid event reference

          const { error: logError } = await supabase.from("logs").insert({
            event_id: eventId,
            sub_category: log.sub_category,
            duration: log.duration || null,
          });

          if (logError) throw logError;
        }
      }

      // ✅ Step 8: Done — reset and navigate
      toast.success("Your reflection has been logged successfully!");
      setTranscription("");
      setShowActions(false);

      // Wait a short moment before navigating
      setTimeout(() => {
        navigate("/user");
      }, 1000);
    } catch (error: any) {
      console.error("Process content error:", error);
      toast.error(error.message || "Failed to create log");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pb-20">
      <div className="px-4 max-w-lg mx-auto w-full">
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
    </div>
  );
}