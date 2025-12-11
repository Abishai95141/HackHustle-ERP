import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Edit, Users } from 'lucide-react';
import { Team, Profile } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminTeams() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('team_name');
      if (error) throw error;
      return data as Team[];
    },
  });

  const { data: teamMembers = {} } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, team_id');
      if (error) throw error;
      const membersMap: Record<string, Profile[]> = {};
      data.forEach((p: any) => {
        if (p.team_id) {
          if (!membersMap[p.team_id]) membersMap[p.team_id] = [];
          membersMap[p.team_id].push(p);
        }
      });
      return membersMap;
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: { team_name: string; team_code: string; table_number?: string }) => {
      const { error } = await supabase.from('teams').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Team created successfully');
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create team');
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; team_name: string; table_number?: string }) => {
      const { error } = await supabase.from('teams').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Team updated successfully');
      setEditingTeam(null);
    },
    onError: () => {
      toast.error('Failed to update team');
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTeamMutation.mutate({
      team_name: formData.get('team_name') as string,
      team_code: formData.get('team_code') as string,
      table_number: (formData.get('table_number') as string) || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeam) return;
    const formData = new FormData(e.currentTarget);
    updateTeamMutation.mutate({
      id: editingTeam.id,
      team_name: formData.get('team_name') as string,
      table_number: (formData.get('table_number') as string) || undefined,
    });
  };

  const filteredTeams = teams.filter(
    (team) =>
      team.team_name.toLowerCase().includes(search.toLowerCase()) ||
      team.team_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-primary">Team Management</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team_name">Team Name</Label>
                <Input id="team_name" name="team_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_code">Team Code (unique)</Label>
                <Input id="team_code" name="team_code" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table_number">Table Number (optional)</Label>
                <Input id="table_number" name="table_number" />
              </div>
              <Button type="submit" disabled={createTeamMutation.isPending}>
                Create Team
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Team Code</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.team_name}</TableCell>
                      <TableCell className="font-mono text-sm">{team.team_code}</TableCell>
                      <TableCell>{team.table_number || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {teamMembers[team.id]?.length || 0}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {team.total_score?.toFixed(1) || '0.0'}
                      </TableCell>
                      <TableCell>
                        <Dialog open={editingTeam?.id === team.id} onOpenChange={(open) => !open && setEditingTeam(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingTeam(team)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Team</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUpdate} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit_team_name">Team Name</Label>
                                <Input
                                  id="edit_team_name"
                                  name="team_name"
                                  defaultValue={editingTeam?.team_name}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_table_number">Table Number</Label>
                                <Input
                                  id="edit_table_number"
                                  name="table_number"
                                  defaultValue={editingTeam?.table_number || ''}
                                />
                              </div>
                              <div className="p-3 bg-secondary rounded-lg">
                                <p className="text-sm font-medium mb-2">Team Members</p>
                                {teamMembers[team.id]?.length > 0 ? (
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {teamMembers[team.id].map((m) => (
                                      <li key={m.id}>{m.name}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No members</p>
                                )}
                              </div>
                              <Button type="submit" disabled={updateTeamMutation.isPending}>
                                Update Team
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
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