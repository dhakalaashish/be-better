import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Clock, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Event {
  id: string;
  name: string;
  importance: number;
  type: 'good' | 'neutral' | 'bad';
  goal: string;
  logCount?: number; // Added to store the count of associated logs
}

interface Log {
  id: string;
  created_at: string;
  duration: number | null;
  intensity: number | null;
  sub_category: string | null;
  event_id: string; // Added for log counting
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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLogForm, setShowAddLogForm] = useState(false);
  const [newLogData, setNewLogData] = useState({
    duration: '',
    intensity: '',
    sub_category: '',
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch all events for the user
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .order('add_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch all logs for the user's events to determine counts
      const eventIds = eventsData.map(event => event.id);
      
      let logsData: Pick<Log, 'event_id'>[] = [];
      if (eventIds.length > 0) {
        const { data: fetchedLogs, error: logsError } = await supabase
          .from('logs')
          .select('event_id') // Only need event_id to count
          .in('event_id', eventIds);

        if (logsError) throw logsError;
        logsData = fetchedLogs;
      }

      const eventLogCounts: { [key: string]: number } = logsData.reduce((acc, log) => {
        acc[log.event_id] = (acc[log.event_id] || 0) + 1;
        return acc;
      }, {});

      const eventsWithLogCounts = eventsData.map(event => ({
        ...event,
        logCount: eventLogCounts[event.id] || 0
      }));

      setEvents(eventsWithLogCounts);
    } catch (error: any) {
      toast.error('Failed to load events and their log counts');
      console.error('Error fetching events with log counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventLogs = async (event: Event) => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
      setSelectedEvent(event);
    } catch (error: any) {
      toast.error('Failed to load logs');
    }
  };

  const handleAddLog = async () => {
    if (!selectedEvent) return;

    const duration = newLogData.duration ? parseInt(newLogData.duration) : null;
    const intensity = newLogData.intensity ? parseInt(newLogData.intensity) : null;

    if (duration !== null && (isNaN(duration) || duration < 0)) {
      toast.error('Duration must be a non-negative number.');
      return;
    }
    if (intensity !== null && (isNaN(intensity) || intensity < 1 || intensity > 5)) {
      toast.error('Intensity must be a number between 1 and 5.');
      return;
    }

    try {
      const { error } = await supabase.from('logs').insert({
        event_id: selectedEvent.id,
        duration: duration,
        intensity: intensity,
        sub_category: newLogData.sub_category || null,
      });

      if (error) throw error;
      toast.success('Log added successfully!');
      setNewLogData({ duration: '', intensity: '', sub_category: '' });
      setShowAddLogForm(false);
      fetchEventLogs(selectedEvent); // Refresh logs for the selected event
      fetchEvents(); // Also refresh event list to update logCount
    } catch (error: any) {
      toast.error('Failed to add log');
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
                    {event.logCount && event.logCount > 0 ? ( // Conditionally render based on logCount
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchEventLogs(event)}
                        className="mt-2"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        View History ({event.logCount})
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          fetchEventLogs(event);
                          setShowAddLogForm(true); // Automatically open add log form
                        }}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Log
                      </Button>
                    )}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{selectedEvent.name} History</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedEvent(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button 
                  className="w-full" 
                  onClick={() => setShowAddLogForm(!showAddLogForm)}
                  variant={showAddLogForm ? 'destructive' : 'default'}
                >
                  {showAddLogForm ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel Add Log
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Log
                    </>
                  )}
                </Button>
              </div>

              {showAddLogForm && (
                <div className="space-y-3 border-b pb-4 mb-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes, optional)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newLogData.duration}
                      onChange={(e) => setNewLogData({ ...newLogData, duration: e.target.value })}
                      placeholder="e.g., 30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="intensity">Intensity (1-5, optional)</Label>
                    <Input
                      id="intensity"
                      type="number"
                      min="1"
                      max="5"
                      value={newLogData.intensity}
                      onChange={(e) => setNewLogData({ ...newLogData, intensity: e.target.value })}
                      placeholder="e.g., 4"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub_category">Sub-category (optional)</Label>
                    <Input
                      id="sub_category"
                      value={newLogData.sub_category}
                      onChange={(e) => setNewLogData({ ...newLogData, sub_category: e.target.value })}
                      placeholder="e.g., Morning workout"
                    />
                  </div>
                  <Button onClick={handleAddLog} className="w-full">
                    Save Log
                  </Button>
                </div>
              )}

              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Add log to start tracking!
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <Card key={log.id}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        {log.duration !== null && (
                          <p className="text-sm text-muted-foreground">
                            Duration: {log.duration} min
                          </p>
                        )}
                        {log.intensity !== null && (
                          <p className="text-sm text-muted-foreground">
                            Intensity: {log.intensity}/5
                          </p>
                        )}
                        {log.sub_category && (
                          <p className="text-sm text-muted-foreground">
                            Category: {log.sub_category}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}