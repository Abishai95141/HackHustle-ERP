import { Profile } from '@/lib/types';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScanResultProps {
  success: boolean;
  message: string;
  profile?: Profile | null;
  onReset: () => void;
}

export function ScanResult({ success, message, profile, onReset }: ScanResultProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 ${
        success ? 'bg-success' : 'bg-destructive'
      }`}
    >
      <div className="text-center text-white space-y-4">
        {success ? (
          <CheckCircle className="h-24 w-24 mx-auto animate-pulse" />
        ) : (
          <XCircle className="h-24 w-24 mx-auto animate-pulse" />
        )}
        
        <h1 className="text-3xl font-display font-bold">
          {success ? 'SUCCESS' : 'DENIED'}
        </h1>
        
        <p className="text-xl">{message}</p>
        
        {profile && (
          <div className="mt-6 p-4 bg-white/10 rounded-lg">
            <p className="text-2xl font-bold">{profile.name}</p>
            {profile.team && (
              <p className="text-lg opacity-90">Team: {profile.team.team_name}</p>
            )}
          </div>
        )}
        
        <Button
          onClick={onReset}
          variant="secondary"
          size="lg"
          className="mt-8 bg-white text-black hover:bg-white/90"
        >
          Scan Next
        </Button>
      </div>
    </div>
  );
}