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
import { LogOut, Plus, X, Edit, Save, XCircle, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [addEventForm, setAddEventForm] = useState({
    name: '',
    importance: 3,
    type: 'neutral' as 'good' | 'neutral' | 'bad',
    goal: 'N/A',
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState('');
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // State for editing events
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventData, setEditingEventData] = useState<Event | null>(null);

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

  const handleAddEvent = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          ...addEventForm,
          user_id: user?.id,
        });

      if (error) throw error;
      toast.success('Event created');
      setShowAddEventForm(false);
      setAddEventForm({ name: '', importance: 3, type: 'neutral', goal: 'N/A' });
      fetchUserEvents(); // Refresh the list of events
    } catch (error: any) {
      toast.error('Failed to create event');
    }
  };

  const handleCancelAddEvent = () => {
    setShowAddEventForm(false);
    setAddEventForm({ name: '', importance: 3, type: 'neutral', goal: 'N/A' });
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

  const handleEditEvent = (event: Event) => {
    setEditingEventData(event);
    setIsEditingEvent(true);
    setShowAddEventForm(false); // Hide add form when editing
  };

  const handleUpdateEvent = async () => {
    if (!editingEventData) return;
    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: editingEventData.name,
          importance: editingEventData.importance,
          type: editingEventData.type,
          goal: editingEventData.goal,
        })
        .eq('id', editingEventData.id);

      if (error) throw error;
      toast.success('Event updated');
      setIsEditingEvent(false);
      setEditingEventData(null);
      fetchUserEvents(); // Refresh the list of events
    } catch (error: any) {
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Event deleted');
      fetchUserEvents(); // Refresh the list of events
    } catch (error: any) {
      toast.error('Failed to delete event');
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
            <Button size="sm" onClick={() => {
              setShowAddEventForm(!showAddEventForm);
              setIsEditingEvent(false); // Hide edit form when opening add form
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddEventForm && (
            <div className="space-y-4 border-b pb-4 mb-4">
              <div>
                <Label htmlFor="add-name">Event Name</Label>
                <Input
                  id="add-name"
                  value={addEventForm.name}
                  onChange={(e) => setAddEventForm({ ...addEventForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="add-importance">Importance (1-5)</Label>
                <Input
                  id="add-importance"
                  type="number"
                  min="1"
                  max="5"
                  value={addEventForm.importance}
                  onChange={(e) => setAddEventForm({ ...addEventForm, importance: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="add-type">Type</Label>
                <Select
                  value={addEventForm.type}
                  onValueChange={(value: 'good' | 'neutral' | 'bad') => 
                    setAddEventForm({ ...addEventForm, type: value })
                  }
                >
                  <SelectTrigger id="add-type">
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
                <Label htmlFor="add-goal">Goal</Label>
                <Select
                  value={addEventForm.goal}
                  onValueChange={(value) => setAddEventForm({ ...addEventForm, goal: value })}
                >
                  <SelectTrigger id="add-goal">
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelAddEvent} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddEvent} className="flex-1">
                  Create Event
                </Button>
              </div>
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
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Event Dialog */}
      <Dialog open={isEditingEvent} onOpenChange={setIsEditingEvent}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEventData && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editingEventData.name}
                  onChange={(e) => setEditingEventData({ ...editingEventData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-importance" className="text-right">
                  Importance
                </Label>
                <Input
                  id="edit-importance"
                  type="number"
                  min="1"
                  max="5"
                  value={editingEventData.importance}
                  onChange={(e) => setEditingEventData({ ...editingEventData, importance: parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={editingEventData.type}
                  onValueChange={(value: 'good' | 'neutral' | 'bad') => 
                    setEditingEventData({ ...editingEventData, type: value })
                  }
                >
                  <SelectTrigger id="edit-type" className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="bad">Bad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-goal" className="text-right">
                  Goal
                </Label>
                <Select
                  value={editingEventData.goal}
                  onValueChange={(value) => setEditingEventData({ ...editingEventData, goal: value })}
                >
                  <SelectTrigger id="edit-goal" className="col-span-3">
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingEvent(false)}>Cancel</Button>
            <Button onClick={handleUpdateEvent}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}