import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef } from 'react';

interface WebBarcodeScannerProps {
  onScan: (result: { data: string; type: string }) => void;
  onError?: (error: string) => void;
}

export default function WebBarcodeScanner({ onScan, onError }: WebBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef('web-barcode-scanner');

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        // Create scanner instance
        const scanner = new Html5Qrcode(scannerIdRef.current);
        scannerRef.current = scanner;

        // Start scanning with back camera
        await scanner.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: 10, // Frames per second
            qrbox: { width: 250, height: 250 }, // Scanning area
            aspectRatio: 1.0,
          },
          (decodedText, decodedResult) => {
            if (mounted) {
              console.log('Barcode scanned:', decodedText);
              onScan({
                data: decodedText,
                type: decodedResult.result.format?.formatName || 'UNKNOWN',
              });
            }
          },
          (errorMessage) => {
            // Ignore errors during scanning (they're frequent)
            // Only log actual issues
            if (errorMessage && !errorMessage.includes('NotFoundException')) {
              console.debug('Scan error:', errorMessage);
            }
          }
        );

        console.log('Web barcode scanner started successfully');
      } catch (err: any) {
        console.error('Failed to start web scanner:', err);
        if (mounted && onError) {
          onError(err?.message || 'Failed to start camera');
        }
      }
    };

    startScanner();

    // Cleanup
    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            console.log('Web scanner stopped');
            scannerRef.current?.clear();
          })
          .catch((err) => {
            console.error('Error stopping scanner:', err);
          });
      }
    };
  }, [onScan, onError]);

  return (
    <div
      id={scannerIdRef.current}
      style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    />
  );
}
