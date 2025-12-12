import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Search, UserPlus, Edit, Trash2 } from 'lucide-react';
import { Profile, AppRole } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import Papa from 'papaparse';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('participant');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, team:teams(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: userRoles = {} } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      const roleMap: Record<string, AppRole> = {};
      data.forEach((r: any) => {
        roleMap[r.user_id] = r.role;
      });
      return roleMap;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Role updated successfully');
      setEditingUser(null);
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const participants = results.data as any[];
        let created = 0;
        let errors = 0;

        for (const p of participants) {
          if (!p.email || !p.name || !p.team_name || !p.team_code) continue;

          try {
            // Create or get team
            let teamId: string;
            const { data: existingTeam } = await supabase
              .from('teams')
              .select('id')
              .eq('team_code', p.team_code)
              .single();

            if (existingTeam) {
              teamId = existingTeam.id;
            } else {
              const { data: newTeam, error: teamError } = await supabase
                .from('teams')
                .insert({ team_name: p.team_name, team_code: p.team_code })
                .select('id')
                .single();
              if (teamError) throw teamError;
              teamId = newTeam.id;
            }

            // Create user via signup (creates auth user + profile via trigger)
            const tempPassword = `Hack${Math.random().toString(36).slice(2, 10)}!`;
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: p.email,
              password: tempPassword,
              options: {
                data: { name: p.name },
              },
            });

            if (authError) {
              if (!authError.message.includes('already registered')) {
                throw authError;
              }
            }

            // Update profile with additional data
            await supabase
              .from('profiles')
              .update({
                team_id: teamId,
                phone: p.phone || null,
                tshirt_size: p.tshirt_size || null,
                dietary_restrictions: p.dietary_restrictions || null,
              })
              .eq('email', p.email);

            created++;
          } catch (err) {
            console.error('Error creating participant:', err);
            errors++;
          }
        }

        toast.success(`Import complete: ${created} created, ${errors} errors`);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      },
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || userRoles[user.id] === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-primary">User Management</h1>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <a href="/sample-participants.csv" download>
            <Button variant="outline" className="gap-2">
              Sample CSV
            </Button>
          </a>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="participant">Participant</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="judge">Judge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.team?.team_name || '-'}</TableCell>
                      <TableCell>
                        <span className="capitalize">{userRoles[user.id]?.replace('_', ' ') || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.is_inside_venue ? 'success' : 'warning'}>
                          {user.is_inside_venue ? 'Inside' : 'Outside'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingUser(user);
                                setNewRole(userRoles[user.id] || 'participant');
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User Role</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>User</Label>
                                <p className="text-muted-foreground">{editingUser?.name} ({editingUser?.email})</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="participant">Participant</SelectItem>
                                    <SelectItem value="volunteer">Volunteer</SelectItem>
                                    <SelectItem value="judge">Judge</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={() => {
                                  if (editingUser) {
                                    updateRoleMutation.mutate({ userId: editingUser.id, role: newRole });
                                  }
                                }}
                                disabled={updateRoleMutation.isPending}
                              >
                                Update Role
                              </Button>
                            </div>
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