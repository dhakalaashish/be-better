import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Event {
  id: string;
  name: string;
  importance: number;
  type: 'good' | 'neutral' | 'bad';
  goal: string;
}

interface Log {
  id: string;
  start_date: string;
  duration: number;
  intensity: number;
  sub_category: string;
}

const typeColors = {
  good: 'bg-success/10 text-success border-success/20',
  neutral: 'bg-muted text-muted-foreground border-border',
  bad: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Logs() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedType, setExpandedType] = useState<string | null>('good');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .order('add_date', { ascending: false });

      if (error) throw error;
      setEvents((data as Event[]) || []);
    } catch (error: any) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventLogs = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('event_id', eventId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
      setSelectedEvent(eventId);
    } catch (error: any) {
      toast.error('Failed to load logs');
    }
  };

  const groupedEvents = {
    good: events.filter(e => e.type === 'good'),
    neutral: events.filter(e => e.type === 'neutral'),
    bad: events.filter(e => e.type === 'bad'),
  };

  const renderEventGroup = (type: 'good' | 'neutral' | 'bad', title: string) => {
    const isExpanded = expandedType === type;
    const typeEvents = groupedEvents[type];

    return (
      <Card className="mb-4 shadow-md">
        <CardHeader 
          className="cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setExpandedType(isExpanded ? null : type)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${type === 'good' ? 'bg-success' : type === 'bad' ? 'bg-destructive' : 'bg-neutral'}`} />
              {title} ({typeEvents.length})
            </CardTitle>
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-3">
            {typeEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No events yet
              </p>
            ) : (
              typeEvents.map(event => (
                <Card key={event.id} className={typeColors[type]}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{event.name}</h3>
                      <Badge variant="outline" className="ml-2">
                        {event.importance}/5
                      </Badge>
                    </div>
                    {event.goal !== 'N/A' && (
                      <p className="text-sm mb-2">Goal: {event.goal}</p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchEventLogs(event.id)}
                      className="mt-2"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      View History
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="pb-20 pt-8 px-4 max-w-lg mx-auto">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-8 px-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Event Logs</h1>
      
      {renderEventGroup('good', 'Good Habits')}
      {renderEventGroup('neutral', 'Neutral Activities')}
      {renderEventGroup('bad', 'Areas to Improve')}

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>Event History</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No logs yet
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <Card key={log.id}>
                      <CardContent className="p-3">
                        <p className="text-sm">
                          {new Date(log.start_date).toLocaleString()}
                        </p>
                        {log.duration && (
                          <p className="text-sm text-muted-foreground">
                            Duration: {log.duration} min
                          </p>
                        )}
                        {log.intensity && (
                          <p className="text-sm text-muted-foreground">
                            Intensity: {log.intensity}/5
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
