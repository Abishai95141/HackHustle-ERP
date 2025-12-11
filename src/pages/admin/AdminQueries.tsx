import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/status-badge';
import { Query, QueryStatus } from '@/lib/types';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminQueries() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: queries = [], isLoading } = useQuery({
    queryKey: ['admin-queries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('queries')
        .select('*, profile:profiles(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Query & { profile: any })[];
    },
  });

  const updateQueryMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: QueryStatus; admin_notes?: string }) => {
      const { error } = await supabase
        .from('queries')
        .update({ status, admin_notes, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-queries'] });
      toast.success('Query updated');
    },
    onError: () => {
      toast.error('Failed to update query');
    },
  });

  const filteredQueries = queries.filter(
    (q) => statusFilter === 'all' || q.status === statusFilter
  );

  const getStatusBadge = (status: QueryStatus) => {
    switch (status) {
      case 'open':
        return <StatusBadge status="error">OPEN</StatusBadge>;
      case 'in_progress':
        return <StatusBadge status="warning">IN PROGRESS</StatusBadge>;
      case 'resolved':
        return <StatusBadge status="success">RESOLVED</StatusBadge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-primary">Support Queries</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="border-primary/20">
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ) : filteredQueries.length === 0 ? (
          <Card className="border-primary/20">
            <CardContent className="py-8 text-center text-muted-foreground">
              No queries found
            </CardContent>
          </Card>
        ) : (
          filteredQueries.map((query) => (
            <Card key={query.id} className="border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{query.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {query.profile?.name} • {format(new Date(query.created_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-secondary rounded text-xs capitalize">
                      {query.category.replace('_', ' ')}
                    </span>
                    {getStatusBadge(query.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{query.description}</p>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Admin Notes</label>
                    <Textarea
                      defaultValue={query.admin_notes || ''}
                      placeholder="Add notes..."
                      className="min-h-[80px]"
                      onBlur={(e) => {
                        if (e.target.value !== (query.admin_notes || '')) {
                          updateQueryMutation.mutate({
                            id: query.id,
                            status: query.status,
                            admin_notes: e.target.value,
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:w-48">
                    <label className="text-sm font-medium">Update Status</label>
                    <Select
                      value={query.status}
                      onValueChange={(value) =>
                        updateQueryMutation.mutate({
                          id: query.id,
                          status: value as QueryStatus,
                          admin_notes: query.admin_notes || undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}