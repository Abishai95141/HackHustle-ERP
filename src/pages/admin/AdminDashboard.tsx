import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DoorOpen, Utensils, HelpCircle, Trophy } from 'lucide-react';
import { AttendanceLog, MealTransaction, Query, Profile, Team } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';

interface DashboardStats {
  totalParticipants: number;
  insideVenue: number;
  openQueries: number;
  totalMealsServed: number;
  totalTeams: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalParticipants: 0,
    insideVenue: 0,
    openQueries: 0,
    totalMealsServed: 0,
    totalTeams: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<(AttendanceLog & { profile: Profile })[]>([]);
  const [recentMeals, setRecentMeals] = useState<(MealTransaction & { profile: Profile })[]>([]);
  const [recentQueries, setRecentQueries] = useState<(Query & { profile: Profile })[]>([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up realtime subscriptions
    const attendanceChannel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const mealsChannel = supabase
      .channel('meals-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_transactions' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    // Subscribe to profile changes for real-time venue status updates
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    // Fetch stats
    const [participantsRes, insideRes, queriesRes, mealsRes, teamsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_inside_venue', true),
      supabase.from('queries').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('meal_transactions').select('id', { count: 'exact', head: true }),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalParticipants: participantsRes.count || 0,
      insideVenue: insideRes.count || 0,
      openQueries: queriesRes.count || 0,
      totalMealsServed: mealsRes.count || 0,
      totalTeams: teamsRes.count || 0,
    });

    // Fetch recent data
    const [attendanceData, mealsData, queriesData] = await Promise.all([
      supabase
        .from('attendance_logs')
        .select('*, profile:profiles(*)')
        .order('timestamp', { ascending: false })
        .limit(10),
      supabase
        .from('meal_transactions')
        .select('*, profile:profiles(*)')
        .order('timestamp', { ascending: false })
        .limit(10),
      supabase
        .from('queries')
        .select('*, profile:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (attendanceData.data) setRecentAttendance(attendanceData.data as any);
    if (mealsData.data) setRecentMeals(mealsData.data as any);
    if (queriesData.data) setRecentQueries(queriesData.data as any);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-primary">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalParticipants}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inside Venue</CardTitle>
            <DoorOpen className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.insideVenue}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalParticipants > 0 
                ? `${Math.round((stats.insideVenue / stats.totalParticipants) * 100)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalTeams}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meals Served</CardTitle>
            <Utensils className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalMealsServed}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Queries</CardTitle>
            <HelpCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.openQueries}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Attendance */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAttendance.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            ) : (
              recentAttendance.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{log.profile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), 'HH:mm')}
                    </p>
                  </div>
                  <StatusBadge status={log.scan_type === 'entry' ? 'success' : 'warning'}>
                    {log.scan_type.toUpperCase()}
                  </StatusBadge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Meals */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Recent Meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMeals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            ) : (
              recentMeals.slice(0, 5).map((meal) => (
                <div key={meal.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{meal.profile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(meal.timestamp), 'HH:mm')}
                    </p>
                  </div>
                  <StatusBadge status="info">{meal.meal_type}</StatusBadge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Queries */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Recent Queries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentQueries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            ) : (
              recentQueries.slice(0, 5).map((query) => (
                <div key={query.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium truncate max-w-[150px]">{query.title}</p>
                    <p className="text-xs text-muted-foreground">{query.profile?.name}</p>
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
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}