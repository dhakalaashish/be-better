import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LogOut, Plus, X, Edit, Save, XCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Event = Tables<'events'>;

const typeColors = {
  good: 'bg-success/10 text-success border-success/20',
  neutral: 'bg-muted text-muted-foreground border-border',
  bad: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function UserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', goals: [] as string[] });
  const [newGoal, setNewGoal] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    importance: 3,
    type: 'neutral' as 'good' | 'neutral' | 'bad',
    goal: 'N/A',
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState('');
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserEvents();
    }
  }, [user]);

  useEffect(() => {
    setEditableName(profile.name);
  }, [profile.name]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({ name: data.name, goals: data.goals || [] });
        setEditableName(data.name);
      }
    } catch (error: any) {
      toast.error('Failed to load profile');
    }
  };

  const fetchUserEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .order('add_date', { ascending: false });

      if (error) throw error;
      setUserEvents(data || []);
    } catch (error: any) {
      toast.error('Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    
    const updatedGoals = [...profile.goals, newGoal];
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ goals: updatedGoals })
        .eq('id', user?.id);

      if (error) throw error;
      setProfile({ ...profile, goals: updatedGoals });
      setNewGoal('');
      toast.success('Goal added');
    } catch (error: any) {
      toast.error('Failed to add goal');
    }
  };

  const removeGoal = async (goal: string) => {
    const updatedGoals = profile.goals.filter(g => g !== goal);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ goals: updatedGoals })
        .eq('id', user?.id);

      if (error) throw error;
      setProfile({ ...profile, goals: updatedGoals });
      toast.success('Goal removed');
    } catch (error: any) {
      toast.error('Failed to remove goal');
    }
  };

  const addEvent = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          ...eventForm,
          user_id: user?.id,
        });

      if (error) throw error;
      toast.success('Event created');
      setShowEventForm(false);
      setEventForm({ name: '', importance: 3, type: 'neutral', goal: 'N/A' });
      fetchUserEvents(); // Refresh the list of events
    } catch (error: any) {
      toast.error('Failed to create event');
    }
  };

  const handleUpdateName = async () => {
    if (!editableName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editableName })
        .eq('id', user?.id);

      if (error) throw error;
      setProfile({ ...profile, name: editableName });
      setIsEditingName(false);
      toast.success('Name updated successfully');
    } catch (error: any) {
      toast.error('Failed to update name');
    }
  };

  return (
    <div className="pb-20 pt-8 px-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                className="flex-1"
              />
              <Button size="icon" variant="ghost" onClick={handleUpdateName}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => {
                setIsEditingName(false);
                setEditableName(profile.name);
              }}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">{profile.name}</p>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle>Your Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add a new goal..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addGoal()}
            />
            <Button onClick={addGoal}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.goals.map((goal, index) => (
              <Badge key={index} variant="secondary" className="pr-1">
                {goal}
                <button
                  onClick={() => removeGoal(goal)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {profile.goals.length === 0 && (
              <p className="text-muted-foreground text-sm">No goals yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Events</CardTitle>
            <Button size="sm" onClick={() => setShowEventForm(!showEventForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showEventForm && (
            <div className="space-y-4 border-b pb-4 mb-4">
              <div>
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="importance">Importance (1-5)</Label>
                <Input
                  id="importance"
                  type="number"
                  min="1"
                  max="5"
                  value={eventForm.importance}
                  onChange={(e) => setEventForm({ ...eventForm, importance: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={eventForm.type}
                  onValueChange={(value: 'good' | 'neutral' | 'bad') => 
                    setEventForm({ ...eventForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="bad">Bad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="goal">Goal</Label>
                <Select
                  value={eventForm.goal}
                  onValueChange={(value) => setEventForm({ ...eventForm, goal: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N/A">N/A</SelectItem>
                    {profile.goals.map((goal, index) => (
                      <SelectItem key={index} value={goal}>
                        {goal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addEvent} className="w-full">
                Create Event
              </Button>
            </div>
          )}

          {loadingEvents ? (
            <p className="text-center text-muted-foreground">Loading events...</p>
          ) : userEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">No events created yet.</p>
          ) : (
            <div className="space-y-3">
              {userEvents.map((event) => (
                <Card key={event.id} className={typeColors[event.type]}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold">{event.name}</h3>
                      <Badge variant="outline" className="ml-2">
                        {event.importance}/5
                      </Badge>
                    </div>
                    {event.goal !== 'N/A' && (
                      <p className="text-sm text-muted-foreground">Goal: {event.goal}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}