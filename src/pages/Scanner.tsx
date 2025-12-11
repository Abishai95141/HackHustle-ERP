import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { QRScanner } from '@/components/scanner/QRScanner';
import { ScanResult } from '@/components/scanner/ScanResult';
import { Profile, MealSession } from '@/lib/types';
import { DoorOpen, Utensils } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

type ScanMode = 'attendance' | 'food';

interface ScanResultData {
  success: boolean;
  message: string;
  profile: Profile | null;
}

export default function Scanner() {
  const { profile: currentUser } = useAuth();
  const [mode, setMode] = useState<ScanMode>('attendance');
  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResultData | null>(null);

  const { data: mealSessions = [] } = useQuery({
    queryKey: ['active-meal-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_sessions')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as MealSession[];
    },
  });

  const handleScan = async (qrToken: string) => {
    if (scanning) return;
    setScanning(true);

    try {
      // Find user by QR token
      const { data: scannedUser, error: userError } = await supabase
        .from('profiles')
        .select('*, team:teams(*)')
        .eq('qr_token', qrToken)
        .single();

      if (userError || !scannedUser) {
        setResult({ success: false, message: 'Invalid QR code', profile: null });
        return;
      }

      if (mode === 'attendance') {
        await handleAttendanceScan(scannedUser as Profile);
      } else {
        await handleFoodScan(scannedUser as Profile);
      }
    } catch (error) {
      console.error('Scan error:', error);
      setResult({ success: false, message: 'Scan failed. Please try again.', profile: null });
    }
  };

  const handleAttendanceScan = async (scannedUser: Profile) => {
    const newStatus = !scannedUser.is_inside_venue;
    const scanType = newStatus ? 'entry' : 'exit';

    // Update user presence
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_inside_venue: newStatus,
        last_scan_timestamp: new Date().toISOString(),
        checked_in_day1: newStatus || scannedUser.checked_in_day1,
      })
      .eq('id', scannedUser.id);

    if (updateError) {
      setResult({ success: false, message: 'Failed to update status', profile: scannedUser });
      return;
    }

    // Log attendance
    await supabase.from('attendance_logs').insert({
      user_id: scannedUser.id,
      scan_type: scanType,
      scanned_by_staff_id: currentUser?.id,
    });

    setResult({
      success: true,
      message: scanType === 'entry' ? 'Entry Recorded' : 'Exit Recorded',
      profile: scannedUser,
    });
  };

  const handleFoodScan = async (scannedUser: Profile) => {
    if (!selectedMeal) {
      setResult({ success: false, message: 'Please select a meal session', profile: null });
      return;
    }

    // Check if already claimed
    const { data: existing } = await supabase
      .from('meal_transactions')
      .select('id')
      .eq('user_id', scannedUser.id)
      .eq('meal_type', selectedMeal)
      .single();

    if (existing) {
      setResult({
        success: false,
        message: 'Already claimed this meal!',
        profile: scannedUser,
      });
      return;
    }

    // Record meal
    const { error } = await supabase.from('meal_transactions').insert({
      user_id: scannedUser.id,
      meal_type: selectedMeal,
      scanned_by_staff_id: currentUser?.id,
    });

    if (error) {
      if (error.code === '23505') {
        setResult({
          success: false,
          message: 'Already claimed this meal!',
          profile: scannedUser,
        });
      } else {
        setResult({ success: false, message: 'Failed to record meal', profile: scannedUser });
      }
      return;
    }

    setResult({
      success: true,
      message: 'Meal Granted!',
      profile: scannedUser,
    });
  };

  const resetScan = () => {
    setResult(null);
    setScanning(false);
  };

  if (result) {
    return <ScanResult {...result} onReset={resetScan} />;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-primary text-center">QR Scanner</h1>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant={mode === 'attendance' ? 'default' : 'outline'}
          size="lg"
          className="h-20 flex-col gap-2"
          onClick={() => setMode('attendance')}
        >
          <DoorOpen className="h-6 w-6" />
          Attendance
        </Button>
        <Button
          variant={mode === 'food' ? 'default' : 'outline'}
          size="lg"
          className="h-20 flex-col gap-2"
          onClick={() => setMode('food')}
        >
          <Utensils className="h-6 w-6" />
          Food
        </Button>
      </div>

      {/* Food Mode: Meal Selection */}
      {mode === 'food' && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Select Meal Session</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMeal} onValueChange={setSelectedMeal}>
              <SelectTrigger>
                <SelectValue placeholder="Choose meal..." />
              </SelectTrigger>
              <SelectContent>
                {mealSessions.map((session) => (
                  <SelectItem key={session.id} value={session.meal_type}>
                    {session.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Scanner */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <QRScanner onScan={handleScan} scanning={scanning} />
        </CardContent>
      </Card>
    </div>
  );
}