import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Utensils } from 'lucide-react';
import { MealSession } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminMeals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<MealSession | null>(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['meal-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MealSession[];
    },
  });

  const { data: mealStats = {} } = useQuery({
    queryKey: ['meal-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_transactions')
        .select('meal_type');
      if (error) throw error;
      const stats: Record<string, number> = {};
      data.forEach((t: any) => {
        stats[t.meal_type] = (stats[t.meal_type] || 0) + 1;
      });
      return stats;
    },
  });

  const { data: checkedInCount = 0 } = useQuery({
    queryKey: ['checked-in-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('checked_in_day1', true);
      if (error) throw error;
      return count || 0;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { meal_type: string; display_name: string }) => {
      const { error } = await supabase.from('meal_sessions').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-sessions'] });
      toast.success('Meal session created');
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create session');
    },
  });

  const toggleSessionMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('meal_sessions')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-sessions'] });
      toast.success('Session updated');
    },
    onError: () => {
      toast.error('Failed to update session');
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createSessionMutation.mutate({
      meal_type: formData.get('meal_type') as string,
      display_name: formData.get('display_name') as string,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-primary">Meal Management</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Meal Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Meal Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meal_type">Meal Type (unique ID)</Label>
                <Input id="meal_type" name="meal_type" placeholder="e.g., LUNCH_DAY1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input id="display_name" name="display_name" placeholder="e.g., Lunch - Day 1" required />
              </div>
              <Button type="submit" disabled={createSessionMutation.isPending}>
                Create Session
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            <CardTitle>Checked-in Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{checkedInCount}</p>
            <p className="text-sm text-muted-foreground">Available for meal service</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Meal Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meal Type</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Served</TableHead>
                  <TableHead>% of Checked-in</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No meal sessions configured
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono text-sm">{session.meal_type}</TableCell>
                      <TableCell className="font-medium">{session.display_name}</TableCell>
                      <TableCell className="font-bold text-primary">
                        {mealStats[session.meal_type] || 0}
                      </TableCell>
                      <TableCell>
                        {checkedInCount > 0
                          ? `${Math.round(((mealStats[session.meal_type] || 0) / checkedInCount) * 100)}%`
                          : '0%'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={session.is_active}
                          onCheckedChange={(checked) =>
                            toggleSessionMutation.mutate({ id: session.id, is_active: checked })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}