import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { User, Users, QrCode, HelpCircle, Trophy, Shirt, Salad } from 'lucide-react';
import { Query, QueryCategory } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function ParticipantDashboard() {
  const { profile, refreshProfile } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [isQueryOpen, setIsQueryOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: myQueries = [] } = useQuery({
    queryKey: ['my-queries', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Query[];
    },
    enabled: !!profile?.id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('team_id', profile.team_id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.team_id,
  });

  const createQueryMutation = useMutation({
    mutationFn: async (data: { category: QueryCategory; title: string; description: string }) => {
      const { error } = await supabase.from('queries').insert({
        user_id: profile?.id,
        team_id: profile?.team_id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-queries'] });
      toast.success('Query submitted!');
      setIsQueryOpen(false);
    },
    onError: () => {
      toast.error('Failed to submit query');
    },
  });

  const handleSubmitQuery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createQueryMutation.mutate({
      category: formData.get('category') as QueryCategory,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
    });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-primary">My Dashboard</h1>

      {/* Profile & QR Card */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{profile.phone || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Shirt className="h-3 w-3" /> T-Shirt Size
                </p>
                <p className="font-medium">{profile.tshirt_size || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground flex items-center gap-1">
                  <Salad className="h-3 w-3" /> Dietary Restrictions
                </p>
                <p className="font-medium">{profile.dietary_restrictions || 'None'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              My QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {showQR ? (
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={profile.qr_token} size={200} />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Show this QR code for venue access and food redemption</p>
                <Button onClick={() => setShowQR(true)} className="gap-2">
                  <QrCode className="h-4 w-4" />
                  Show My QR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            My Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.team ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-primary">{profile.team.team_name}</h3>
                  <p className="text-sm text-muted-foreground">Code: {profile.team.team_code}</p>
                </div>
                {profile.team.table_number && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Table</p>
                    <p className="text-2xl font-bold">{profile.team.table_number}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Team Members</p>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((member) => (
                    <span
                      key={member.id}
                      className="px-3 py-1 bg-secondary rounded-full text-sm"
                    >
                      {member.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Not assigned to a team yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/leaderboard">
          <Button variant="outline" className="w-full h-16 gap-2">
            <Trophy className="h-5 w-5" />
            View Leaderboard
          </Button>
        </Link>
        <Dialog open={isQueryOpen} onOpenChange={setIsQueryOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full h-16 gap-2">
              <HelpCircle className="h-5 w-5" />
              Raise Query
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise Support Query</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitQuery} className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wifi">WiFi / Internet</SelectItem>
                    <SelectItem value="bug">System Bug</SelectItem>
                    <SelectItem value="mentor_help">Mentor Help</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" placeholder="Brief description" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Provide more details..." rows={4} />
              </div>
              <Button type="submit" disabled={createQueryMutation.isPending}>
                Submit Query
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Queries */}
      {myQueries.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>My Queries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myQueries.map((query) => (
              <div
                key={query.id}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
              >
                <div>
                  <p className="font-medium">{query.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(query.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
                <StatusBadge
                  status={
                    query.status === 'resolved'
                      ? 'success'
                      : query.status === 'in_progress'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {query.status.replace('_', ' ').toUpperCase()}
                </StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}