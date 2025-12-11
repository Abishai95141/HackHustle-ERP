import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  scanning: boolean;
}

export function QRScanner({ onScan, scanning }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    try {
      scannerRef.current = new Html5Qrcode('qr-reader');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (!scanning) {
            onScan(decodedText);
          }
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      setError('Failed to start camera. Please ensure camera permissions are granted.');
      console.error(err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        id="qr-reader"
        className="w-full aspect-square max-w-sm mx-auto bg-secondary rounded-lg overflow-hidden"
      />
      
      {error && (
        <p className="text-destructive text-sm text-center">{error}</p>
      )}

      <div className="flex justify-center">
        {!isScanning ? (
          <Button onClick={startScanning} size="lg" className="gap-2">
            <Camera className="h-5 w-5" />
            Start Scanner
          </Button>
        ) : (
          <Button onClick={stopScanning} variant="outline" size="lg" className="gap-2">
            <CameraOff className="h-5 w-5" />
            Stop Scanner
          </Button>
        )}
      </div>
    </div>
  );
}