import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { JudgeAssignment, JudgeScore, Team } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function JudgePanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['judge-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judge_assignments')
        .select('*, team:teams(*)')
        .eq('judge_id', user?.id);
      if (error) throw error;
      return data as (JudgeAssignment & { team: Team })[];
    },
    enabled: !!user?.id,
  });

  const { data: existingScores = {} } = useQuery({
    queryKey: ['judge-scores', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judge_scores')
        .select('*')
        .eq('judge_id', user?.id);
      if (error) throw error;
      const scoresMap: Record<string, JudgeScore> = {};
      data.forEach((s: any) => {
        scoresMap[`${s.team_id}-${s.round_name}`] = s;
      });
      return scoresMap;
    },
    enabled: !!user?.id,
  });

  const submitScoreMutation = useMutation({
    mutationFn: async (scores: {
      team_id: string;
      round_name: string;
      score_innovation: number;
      score_feasibility: number;
      score_code_quality: number;
      score_presentation: number;
    }) => {
      const existingKey = `${scores.team_id}-${scores.round_name}`;
      const existing = existingScores[existingKey];

      if (existing) {
        const { error } = await supabase
          .from('judge_scores')
          .update({
            ...scores,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('judge_scores').insert({
          judge_id: user?.id,
          ...scores,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-scores'] });
      toast.success('Score saved!');
    },
    onError: () => {
      toast.error('Failed to save score');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading assignments...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="font-display text-2xl font-bold text-primary mb-4">Judge Panel</h1>
        <p className="text-muted-foreground">No teams assigned to you yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-primary">Judge Panel</h1>
      <p className="text-muted-foreground">Score the teams assigned to you.</p>

      <div className="grid gap-6">
        {assignments.map((assignment) => (
          <TeamScoreCard
            key={assignment.id}
            assignment={assignment}
            existingScore={existingScores[`${assignment.team_id}-${assignment.round_name}`]}
            onSubmit={(scores) => submitScoreMutation.mutate(scores)}
            isSubmitting={submitScoreMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function TeamScoreCard({
  assignment,
  existingScore,
  onSubmit,
  isSubmitting,
}: {
  assignment: JudgeAssignment & { team: Team };
  existingScore?: JudgeScore;
  onSubmit: (scores: any) => void;
  isSubmitting: boolean;
}) {
  const [innovation, setInnovation] = useState(existingScore?.score_innovation ?? 5);
  const [feasibility, setFeasibility] = useState(existingScore?.score_feasibility ?? 5);
  const [codeQuality, setCodeQuality] = useState(existingScore?.score_code_quality ?? 5);
  const [presentation, setPresentation] = useState(existingScore?.score_presentation ?? 5);

  const total = innovation + feasibility + codeQuality + presentation;

  const handleSubmit = () => {
    onSubmit({
      team_id: assignment.team_id,
      round_name: assignment.round_name,
      score_innovation: innovation,
      score_feasibility: feasibility,
      score_code_quality: codeQuality,
      score_presentation: presentation,
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{assignment.team.team_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {assignment.round_name} • Table: {assignment.team.table_number || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{total}</p>
            <p className="text-xs text-muted-foreground">/ 40</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ScoreSlider
          label="Innovation"
          value={innovation}
          onChange={setInnovation}
        />
        <ScoreSlider
          label="Feasibility"
          value={feasibility}
          onChange={setFeasibility}
        />
        <ScoreSlider
          label="Code Quality"
          value={codeQuality}
          onChange={setCodeQuality}
        />
        <ScoreSlider
          label="Presentation"
          value={presentation}
          onChange={setPresentation}
        />

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {existingScore ? 'Update Score' : 'Submit Score'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        <span className="text-lg font-bold text-primary">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={10}
        step={1}
        className="py-2"
      />
    </div>
  );
}