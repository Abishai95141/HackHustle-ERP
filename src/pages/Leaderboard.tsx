import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal } from 'lucide-react';
import { Team } from '@/lib/types';

export default function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();

    // Realtime subscription
    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('total_score', { ascending: false });
    
    if (!error && data) {
      setTeams(data as Team[]);
    }
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="w-6 text-center font-bold text-muted-foreground">{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-primary mb-2">LEADERBOARD</h1>
        <p className="text-muted-foreground">Live rankings updated in real-time</p>
      </div>

      {/* Top 3 Podium */}
      {teams.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center mt-8">
            <Medal className="h-12 w-12 text-gray-400 mb-2" />
            <Card className="w-full border-gray-400/50 bg-gradient-to-b from-gray-400/10 to-transparent">
              <CardContent className="pt-6 text-center">
                <p className="font-bold text-lg">{teams[1]?.team_name}</p>
                <p className="text-3xl font-display font-bold text-gray-400">
                  {teams[1]?.total_score?.toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <Trophy className="h-16 w-16 text-yellow-500 mb-2" />
            <Card className="w-full border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-transparent">
              <CardContent className="pt-6 text-center">
                <p className="font-bold text-xl">{teams[0]?.team_name}</p>
                <p className="text-4xl font-display font-bold text-yellow-500">
                  {teams[0]?.total_score?.toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center mt-8">
            <Medal className="h-10 w-10 text-amber-600 mb-2" />
            <Card className="w-full border-amber-600/50 bg-gradient-to-b from-amber-600/10 to-transparent">
              <CardContent className="pt-6 text-center">
                <p className="font-bold">{teams[2]?.team_name}</p>
                <p className="text-2xl font-display font-bold text-amber-600">
                  {teams[2]?.total_score?.toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Full Rankings Table */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Table</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No teams ranked yet
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team, index) => (
                  <TableRow key={team.id} className={index < 3 ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <div className="flex items-center">{getRankIcon(index + 1)}</div>
                    </TableCell>
                    <TableCell className="font-medium">{team.team_name}</TableCell>
                    <TableCell className="text-muted-foreground">{team.table_number || '-'}</TableCell>
                    <TableCell className="text-right font-bold text-primary text-lg">
                      {team.total_score?.toFixed(1) || '0.0'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}