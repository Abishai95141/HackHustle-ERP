import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Search, UserPlus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Profile, AppRole } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import Papa from 'papaparse';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('participant');
  const [isImporting, setIsImporting] = useState(false);
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  const downloadCredentialsCSV = (credentials: { name: string; email: string; password: string; team_name: string }[]) => {
    const csvContent = Papa.unparse(credentials, {
      columns: ['name', 'email', 'password', 'team_name'],
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `login-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const participants = results.data as any[];
        let created = 0;
        let errors = 0;
        let skipped = 0;
        const createdCredentials: { name: string; email: string; password: string; team_name: string }[] = [];

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

            // Create user via edge function (doesn't affect current session)
            const tempPassword = `Hack${Math.random().toString(36).slice(2, 10)}!`;
            
            const response = await supabase.functions.invoke('create-user', {
              body: {
                email: p.email,
                password: tempPassword,
                name: p.name,
                team_id: teamId,
                phone: p.phone || null,
                tshirt_size: p.tshirt_size || null,
                dietary_restrictions: p.dietary_restrictions || null,
              },
            });

            if (response.error) {
              throw response.error;
            }

            if (response.data?.error) {
              if (response.data.error.includes('already been registered')) {
                skipped++;
                continue;
              }
              throw new Error(response.data.error);
            }

            // Track credentials for download
            createdCredentials.push({
              name: p.name,
              email: p.email,
              password: tempPassword,
              team_name: p.team_name,
            });

            created++;
          } catch (err: any) {
            console.error('Error creating participant:', err);
            errors++;
          }
        }

        setIsImporting(false);
        toast.success(`Import complete: ${created} created, ${skipped} skipped, ${errors} errors`);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });

        // Download credentials CSV if any users were created
        if (createdCredentials.length > 0) {
          downloadCredentialsCSV(createdCredentials);
          toast.info('Login credentials CSV downloaded');
        }
      },
      error: () => {
        setIsImporting(false);
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
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2" disabled={isImporting}>
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Import CSV'}
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
                        <div className="flex gap-1">
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{user.name}</strong> ({user.email})? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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